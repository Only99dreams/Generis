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

async function base64HmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const binary = String.fromCharCode(...new Uint8Array(sig));
  return btoa(binary);
}

function safe(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s === "null" ? "" : s;
}

async function computeNombaSignature(secret: string, body: string, timestamp: string): Promise<string> {
  const event = JSON.parse(body);
  const data = event.data || {};
  const merchant = data.merchant || {};
  const transaction = data.transaction || {};

  const parts = [
    safe(event.event_type),
    safe(event.requestId),
    safe(merchant.userId),
    safe(merchant.walletId),
    safe(transaction.transactionId),
    safe(transaction.type),
    safe(transaction.time),
    safe(transaction.responseCode),
    safe(timestamp),
  ];
  const hashingPayload = parts.join(":");

  console.log("Hashing payload:", JSON.stringify(hashingPayload));
  console.log("Secret length:", secret.length);

  return await base64HmacSha256(secret, hashingPayload);
}

function koboToNaira(kobo: number): number {
  return kobo / 100;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const event = JSON.parse(body);
    const eventType = event.event_type || event.type || "";
    const requestId = event.requestId || "";

    if (requestId) {
      const { error: dupErr } = await supabase
        .from("processed_events")
        .insert({ request_id: requestId });
      if (dupErr && dupErr.code === "23505") {
        console.log("Duplicate event, already processed:", requestId);
        return new Response("OK", { status: 200 });
      }
      if (dupErr) {
        console.log("processed_events insert error:", dupErr);
      }
    }

    if (eventType === "payment_success") {
      return await handlePaymentSuccess(event, supabase);
    }

    if (eventType === "payment_reversal") {
      return await handlePaymentReversal(event, supabase);
    }

    if (eventType === "payout_success" || eventType === "payout_failed" || eventType === "payout_refund") {
      return await handlePayoutEvent(eventType, event, supabase);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.log("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutOrder(webhook: any, supabase: any) {
  const order = webhook.data?.order || {};
  const tx = webhook.data?.transaction || {};
  const orderRef = order.orderReference;

  if (!orderRef) return null;

  const { data: link } = await supabase
    .from("payment_links")
    .select("*")
    .eq("reference", orderRef)
    .maybeSingle();

  if (!link) return null;

  const amountKobo = tx.transactionAmount || order.amount * 100;
  const feeKobo = tx.fee || 0;
  const creditAmountNaira = koboToNaira(amountKobo - feeKobo);
  const paymentMethod = order.paymentMethod || "card_payment";
  const cardInfo = order.cardType ? `${order.cardType} ****${order.cardLast4Digits || ""}` : "";

  const isOrg = !!link.organization_id;
  const walletUserId = link.user_id;

  if (!walletUserId) {
    console.log("No wallet user for checkout order");
    return new Response("Wallet user not found", { status: 404 });
  }

  let walletQuery = supabase.from("wallets").select("*");
  if (isOrg) {
    walletQuery = walletQuery.eq("user_id", walletUserId).eq("organization_id", link.organization_id);
  } else {
    walletQuery = walletQuery.is("organization_id", null).eq("user_id", walletUserId);
  }

  const { data: wallet } = await walletQuery.maybeSingle();
  if (!wallet) {
    console.log("No wallet found for checkout order");
    return new Response("Wallet not found", { status: 404 });
  }

  const reference = `CHK-${tx.transactionId || orderRef}`;

  const { error: txErr } = await supabase.from("transactions").insert({
    organization_id: link.organization_id,
    user_id: walletUserId,
    transaction_type: "credit",
    amount: creditAmountNaira,
    reference,
    status: "completed",
    category: "payment",
    narration: `Card payment via ${paymentMethod}${cardInfo ? ` (${cardInfo})` : ""}${link.description ? ` - ${link.description}` : ""}`,
    metadata: {
      order_reference: orderRef,
      payment_link_reference: orderRef,
      payment_method: paymentMethod,
      card_type: order.cardType,
      card_last4: order.cardLast4Digits,
      transaction_id: tx.transactionId,
      fee_kobo: feeKobo,
      amount_kobo: amountKobo,
    },
  });

  if (txErr && txErr.code !== "23505") {
    console.log("Transaction insert error:", txErr);
    return new Response("Error recording transaction", { status: 500 });
  }

  if (txErr?.code === "23505") {
    return new Response("OK", { status: 200 });
  }

  const newBalance = Number(wallet.available_balance) + creditAmountNaira;
  await supabase
    .from("wallets")
    .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", wallet.id);

  await supabase
    .from("payment_links")
    .update({ status: "completed", times_used: link.times_used + 1 })
    .eq("id", link.id);

  const notifyTitle = `Payment received: ${formatCurrency(creditAmountNaira)}`;
  const notifyMessage = `A card payment of ${formatCurrency(creditAmountNaira)} was received${link.description ? ` for ${link.description}` : ""}.`;

  if (isOrg) {
    const { data: members } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", link.organization_id);

    if (members) {
      const notifications = members.map((m) => ({
        organization_id: link.organization_id,
        user_id: m.user_id,
        title: notifyTitle,
        message: notifyMessage,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  } else {
    await supabase.from("notifications").insert({
      user_id: walletUserId,
      title: notifyTitle,
      message: notifyMessage,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePaymentSuccess(webhook: any, supabase: any) {
  const checkoutResult = await handleCheckoutOrder(webhook, supabase);
  if (checkoutResult) return checkoutResult;

  const tx = webhook.data?.transaction || {};
  const customerData = webhook.data?.customer || {};
  const aliasAccountNumber = tx.aliasAccountNumber;
  const sessionId = tx.sessionId;

  const amountKobo = tx.transactionAmount;
  const feeKobo = tx.fee || 0;
  const creditAmountNaira = koboToNaira(amountKobo - feeKobo);

  const narration = tx.narration || "";
  const senderName = customerData.senderName || "";
  const senderBank = customerData.bankName || "";

  if (!aliasAccountNumber || !sessionId || !amountKobo) {
    return new Response("OK - not a VA transaction", { status: 200 });
  }

  const { data: va } = await supabase
    .from("virtual_accounts")
    .select("*")
    .eq("account_number", aliasAccountNumber)
    .maybeSingle();

  if (!va) {
    console.log("No VA found for account:", aliasAccountNumber);
    return new Response("Virtual account not found", { status: 404 });
  }

  const isOrg = !!va.organization_id;

  let walletUserId: string | null = null;
  let query = supabase.from("wallets").select("*");
  if (isOrg) {
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
    return new Response("Wallet user not found", { status: 404 });
  }

  const { data: wallet } = await query.maybeSingle();

  if (!wallet) {
    console.log("No wallet found");
    return new Response("Wallet not found", { status: 404 });
  }

  const reference = `NMB-${sessionId}`;

  if (isOrg && va.customer_id) {
    const { error: payErr } = await supabase.from("payments").insert({
      organization_id: va.organization_id,
      customer_id: va.customer_id,
      amount: creditAmountNaira,
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
    amount: creditAmountNaira,
    reference,
    status: "completed",
    category: "payment",
    narration: narration || `Payment from ${senderName}`,
    metadata: {
      session_id: sessionId,
      sender_name: senderName,
      sender_bank: senderBank,
      fee_kobo: feeKobo,
      amount_kobo: amountKobo,
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

  const newBalance = Number(wallet.available_balance) + creditAmountNaira;
  await supabase
    .from("wallets")
    .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", wallet.id);

  const notifyTitle = isOrg
    ? `Payment received: ${formatCurrency(creditAmountNaira)}`
    : `Money received: ${formatCurrency(creditAmountNaira)}`;
  const notifyMessage = isOrg
    ? `A payment of ${formatCurrency(creditAmountNaira)} was received from ${senderName || aliasAccountNumber}.`
    : `${formatCurrency(creditAmountNaira)} has been credited to your wallet from ${senderName || aliasAccountNumber}.`;

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
}

async function handlePayoutEvent(eventType: string, webhook: any, supabase: any) {
  const tx = webhook.data?.transaction || {};
  const merchantTxRef = tx.merchantTxRef;
  const sessionId = tx.sessionId;
  const amountKobo = tx.transactionAmount;
  const amountNaira = koboToNaira(amountKobo || 0);
  const feeKobo = tx.fee || 0;
  const narration = tx.narration || "";
  const recipientName = webhook.data?.customer?.recipientName || "";

  if (!merchantTxRef) {
    console.log("Missing merchantTxRef for payout event");
    return new Response("OK", { status: 200 });
  }

  const { data: transfer } = await supabase
    .from("transfers")
    .select("*")
    .eq("reference", merchantTxRef)
    .maybeSingle();

  if (!transfer) {
    console.log("No transfer found for reference:", merchantTxRef);
    return new Response("Transfer not found", { status: 404 });
  }

  const isSuccess = eventType === "payout_success";
  const isRefund = eventType === "payout_refund";

  if (isSuccess) {
    await supabase
      .from("transfers")
      .update({
        transfer_status: "success",
        provider_reference: tx.transactionId || null,
      })
      .eq("id", transfer.id);

    await supabase
      .from("transactions")
      .update({ status: "success" })
      .eq("reference", merchantTxRef);

    await supabase.from("notifications").insert({
      user_id: transfer.user_id,
      organization_id: transfer.organization_id,
      title: "Transfer Successful",
      message: `${formatCurrency(amountNaira)} transferred to ${transfer.beneficiary_name || recipientName} successfully`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (transfer.transfer_status !== "pending") {
    return new Response("OK - already processed", { status: 200 });
  }

  await supabase
    .from("transfers")
    .update({
      transfer_status: isRefund ? "refunded" : "failed",
      provider_reference: tx.transactionId || null,
    })
    .eq("id", transfer.id);

  await supabase
    .from("transactions")
    .update({ status: isRefund ? "refunded" : "failed" })
    .eq("reference", merchantTxRef);

  await supabase.rpc("credit_wallet", {
    p_user_id: transfer.user_id,
    p_amount: amountNaira,
  });

  const reversalRef = `REV-${merchantTxRef}`;
  await supabase.from("transactions").insert({
    user_id: transfer.user_id,
    organization_id: transfer.organization_id,
    transaction_type: "credit",
    amount: amountNaira,
    reference: reversalRef,
    status: "completed",
    category: "reversal",
    narration: isRefund
      ? `Refund for transfer ${merchantTxRef}`
      : `Reversal for failed transfer ${merchantTxRef}`,
    metadata: {
      original_transfer: merchantTxRef,
      session_id: sessionId,
      reason: isRefund ? "payout_refund" : "payout_failed",
    },
  });

  const statusLabel = isRefund ? "refunded" : "failed";
  const reasonText = isRefund
    ? "The transfer was refunded by the beneficiary bank"
    : "The transfer failed after processing";

  await supabase.from("notifications").insert({
    user_id: transfer.user_id,
    organization_id: transfer.organization_id,
    title: `Transfer ${statusLabel}`,
    message: `${formatCurrency(amountNaira)} transfer to ${transfer.beneficiary_name || recipientName} ${statusLabel}. ${reasonText}. Amount credited back to wallet.`,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePaymentReversal(webhook: any, supabase: any) {
  const tx = webhook.data?.transaction || {};
  const aliasAccountNumber = tx.aliasAccountNumber;
  const sessionId = tx.sessionId;
  const amountKobo = tx.transactionAmount;
  const feeKobo = tx.fee || 0;
  const debitAmountNaira = koboToNaira(amountKobo - feeKobo);
  const narration = tx.narration || "";
  const senderName = webhook.data?.customer?.senderName || "";

  if (!sessionId || !amountKobo) {
    return new Response("OK", { status: 200 });
  }

  const reference = `NMB-${sessionId}`;

  const { data: originalTx } = await supabase
    .from("transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (!originalTx) {
    console.log("No original transaction found for reversal:", reference);
    return new Response("Original transaction not found", { status: 404 });
  }

  const reversalRef = `REV-${sessionId}`;
  const { error: revErr } = await supabase.from("transactions").insert({
    organization_id: originalTx.organization_id,
    user_id: originalTx.user_id,
    transaction_type: "debit",
    amount: debitAmountNaira,
    reference: reversalRef,
    status: "completed",
    category: "reversal",
    narration: narration || `Reversal of payment from ${senderName || aliasAccountNumber}`,
    metadata: {
      original_reference: reference,
      session_id: sessionId,
      va_account_number: aliasAccountNumber,
      reason: "payment_reversal",
    },
  });

  if (revErr && revErr.code !== "23505") {
    console.log("Reversal transaction insert error:", revErr);
    return new Response("Error recording reversal", { status: 500 });
  }

  if (revErr?.code === "23505") {
    return new Response("OK - already processed", { status: 200 });
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", originalTx.user_id)
    .maybeSingle();

  if (wallet) {
    const newBalance = Number(wallet.available_balance) - debitAmountNaira;
    await supabase
      .from("wallets")
      .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);
  }

  if (originalTx.organization_id) {
    const { data: members } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", originalTx.organization_id);

    if (members) {
      const notifications = members.map((m) => ({
        organization_id: originalTx.organization_id,
        user_id: m.user_id,
        title: "Payment Reversed",
        message: `A payment of ${formatCurrency(debitAmountNaira)} from ${senderName || aliasAccountNumber} has been reversed. ${formatCurrency(debitAmountNaira)} has been debited from your wallet.`,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  } else {
    await supabase.from("notifications").insert({
      user_id: originalTx.user_id,
      title: "Payment Reversed",
      message: `${formatCurrency(debitAmountNaira)} payment from ${senderName || aliasAccountNumber} reversed. Amount debited from your wallet.`,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatCurrency(n: number): string {
  return `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
