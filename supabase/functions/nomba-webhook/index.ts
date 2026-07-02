import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOMBA_WEBHOOK_SECRET = Deno.env.get("NOMBA_WEBHOOK_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  if (!secret) return true;
  try {
    const payload = JSON.parse(body);
    const data = payload.data || {};
    const merchant = data.merchant || {};
    const transaction = data.transaction || {};

    const eventType = payload.event_type || "";
    const requestId = payload.requestId || "";
    const userId = merchant.userId || "";
    const walletId = merchant.walletId || "";
    const transactionId = transaction.transactionId || "";
    const transactionType = transaction.type || "";
    const transactionTime = transaction.time || "";
    let responseCode = transaction.responseCode || "";
    if (responseCode === "null") responseCode = "";

    const hashingPayload = [
      eventType, requestId, userId, walletId,
      transactionId, transactionType, transactionTime,
      responseCode, timestamp,
    ].join(":");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(hashingPayload));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    return expected === signature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("nomba-signature") || "";
    const timestamp = req.headers.get("nomba-timestamp") || "";

    if (!verifySignature(body, signature, timestamp, NOMBA_WEBHOOK_SECRET)) {
      console.log("Signature verification failed");
      return new Response("Unauthorized", { status: 401 });
    }

    const webhook = JSON.parse(body);
    const eventType = webhook.event_type;

    if (eventType !== "payment_success") {
      return new Response("OK", { status: 200 });
    }

    const tx = webhook.data?.transaction || {};
    const customerData = webhook.data?.customer || {};
    const aliasAccountNumber = tx.aliasAccountNumber;
    const sessionId = tx.sessionId;
    const amount = tx.transactionAmount;
    const fee = tx.fee || 0;
    const narration = tx.narration || "";
    const senderName = customerData.senderName || "";
    const senderBank = customerData.bankName || "";

    if (!aliasAccountNumber || !sessionId || !amount) {
      return new Response("Missing required fields", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: va } = await supabase
      .from("virtual_accounts")
      .select("*")
      .eq("account_number", aliasAccountNumber)
      .maybeSingle();

    if (!va) {
      console.log("No VA found for account:", aliasAccountNumber);
      return new Response("Virtual account not found", { status: 200 });
    }

    const isOrg = !!va.organization_id;

    let walletUserId: string | null = null;
    let query = supabase.from("wallets").select("*");
    if (isOrg) {
      // Org VA: credit the org owner's wallet
      const { data: org } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", va.organization_id)
        .single();
      walletUserId = org?.owner_id || null;
      if (walletUserId) {
        query = query.eq("user_id", walletUserId).eq("organization_id", va.organization_id);
      }
    } else {
      walletUserId = va.user_id;
      query = query.is("organization_id", null).eq("user_id", walletUserId);
    }

    if (!walletUserId) {
      console.log("No wallet user determined");
      return new Response("Wallet user not found", { status: 200 });
    }

    const { data: wallet } = await query.maybeSingle();

    if (!wallet) {
      console.log("No wallet found");
      return new Response("Wallet not found", { status: 200 });
    }

    const creditAmount = amount - fee;
    const reference = `NMB-${sessionId}`;

    if (isOrg && va.customer_id) {
      const { error: payErr } = await supabase.from("payments").insert({
        organization_id: va.organization_id,
        customer_id: va.customer_id,
        amount: creditAmount,
        reference,
        payment_channel: "virtual_account",
        payment_status: "completed",
        paid_at: new Date().toISOString(),
      });
      if (payErr && payErr.code !== "23505") {
        console.log("Payment insert error:", payErr);
      }
    }

    const { error: txErr } = await supabase.from("transactions").insert({
      organization_id: va.organization_id,
      user_id: walletUserId,
      transaction_type: "credit",
      amount: creditAmount,
      reference,
      status: "completed",
      category: "payment",
      narration: narration || `Payment from ${senderName}`,
      metadata: {
        session_id: sessionId,
        sender_name: senderName,
        sender_bank: senderBank,
        fee,
        va_account_number: aliasAccountNumber,
        va_account_name: tx.aliasAccountName,
      },
    });
    if (txErr && txErr.code !== "23505") {
      console.log("Transaction insert error:", txErr);
      return new Response("Error recording transaction", { status: 500 });
    }

    if (txErr?.code === "23505") {
      return new Response("OK", { status: 200 });
    }

    const newBalance = Number(wallet.available_balance) + creditAmount;
    await supabase
      .from("wallets")
      .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);

    const notifyTitle = isOrg
      ? `Payment received: ${formatCurrency(creditAmount)}`
      : `Money received: ${formatCurrency(creditAmount)}`;
    const notifyMessage = isOrg
      ? `A payment of ${formatCurrency(creditAmount)} was received from ${senderName || aliasAccountNumber}.`
      : `${formatCurrency(creditAmount)} has been credited to your wallet from ${senderName || aliasAccountNumber}.`;

    if (isOrg) {
      const { data: members } = await supabase
        .from("organization_users")
        .select("user_id")
        .eq("organization_id", va.organization_id);

      if (members) {
        const notifications = members.map((m) => ({
          organization_id: va.organization_id,
          user_id: m.user_id,
          title: notifyTitle,
          message: notifyMessage,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    } else if (walletUserId) {
      await supabase.from("notifications").insert({
        user_id: walletUserId,
        title: notifyTitle,
        message: notifyMessage,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatCurrency(n: number): string {
  return `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
