import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getNombaToken() {
  const response = await fetch(
    "https://api.nomba.com/v1/auth/token/issue",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")!,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("NOMBA_CLIENT_ID"),
        client_secret: Deno.env.get("NOMBA_CLIENT_SECRET"),
      }),
    }
  );
  const data = await response.json();
  return data.data.access_token;
}

async function sendEmailNotification(supabase: any, userId: string, subject: string, html: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;

    const functionsUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "") + "/functions/v1/send-email";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: profile.email,
        subject,
        html,
        userId,
      }),
    });
  } catch {
    // Email is best-effort; don't let it break the transfer flow
  }
}

async function sendSmsNotification(supabase: any, userId: string, message: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .single();

    if (!profile?.phone) return;

    const functionsUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "") + "/functions/v1/send-sms";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: profile.phone,
        message,
        userId,
      }),
    });
  } catch {
    // SMS is best-effort; don't let it break the transfer flow
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let userId, amount, txnRef;

  try {
    const { userId: u, organizationId: orgId, amount: amt, accountNumber, bankCode, bankName, beneficiaryName, narration, fee: transferFee } = await req.json();
    userId = u;
    amount = amt;
    const organizationId = orgId || null;

    const transferAmount = amount - (transferFee || 0);

    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      await supabase.from("notifications").insert({
        user_id: userId,
        organization_id: organizationId,
        title: "No Wallet Found",
        message: `Transfer of ₦${amount} failed — no wallet found for your account`,
      });

      return new Response(JSON.stringify({
        error: "No wallet found for your account — please contact support",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet.available_balance < amount) {
      await supabase.from("notifications").insert({
        user_id: userId,
        organization_id: organizationId,
        title: "Insufficient Balance",
        message: `Transfer of ₦${amount} failed — insufficient wallet balance (₦${wallet.available_balance} available)`,
      });

      await sendEmailNotification(
        supabase, userId,
        "Transfer Failed — Insufficient Balance",
        `<p>Your transfer of <strong>₦${amount}</strong> to ${beneficiaryName} failed due to insufficient balance.</p><p>Available balance: <strong>₦${wallet.available_balance}</strong></p>`
      );

      await sendSmsNotification(
        supabase, userId,
        `Transfer of ₦${amount} failed: insufficient balance (₦${wallet.available_balance} available).`
      );

      const shortfall = amount - wallet.available_balance;
      return new Response(JSON.stringify({
        error: `Insufficient balance — you have ₦${wallet.available_balance} but need ₦${amount} (₦${shortfall} short)`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: debited } = await supabase.rpc("debit_wallet", {
      p_user_id: userId,
      p_amount: amount,
    });

    if (!debited) {
      await supabase.from("notifications").insert({
        user_id: userId,
        organization_id: organizationId,
        title: "Transfer Failed",
        message: `₦${amount} transfer failed — could not debit wallet`,
      });

      await sendEmailNotification(
        supabase, userId,
        "Transfer Failed — Wallet Debit Error",
        `<p>Your transfer of <strong>₦${amount}</strong> to ${beneficiaryName} could not be processed because the wallet could not be debited.</p><p>Please try again or contact support.</p>`
      );

      return new Response(JSON.stringify({ error: "Failed to debit wallet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = crypto.randomUUID();
    txnRef = `TFR-${reference.slice(0, 12).toUpperCase()}`;

    await supabase.from("transactions").insert({
      user_id: userId,
      organization_id: organizationId,
      amount: transferAmount,
      transaction_type: "transfer",
      reference: txnRef,
      status: "pending",
      category: "transfer",
      narration: narration || "Bank Transfer",
    });

    if (transferFee) {
      const feeRef = `${txnRef}-FEE`;
      await supabase.from("transactions").insert({
        user_id: userId,
        organization_id: organizationId,
        amount: transferFee,
        transaction_type: "fee",
        reference: feeRef,
        status: "success",
        category: "fee",
        narration: "Transfer Fee (1%)",
      });

      await supabase.from("ledger_entries").insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount: transferFee,
        entry_type: "debit",
        reference: feeRef,
      });
    }

    await supabase.from("ledger_entries").insert({
      user_id: userId,
      wallet_id: wallet.id,
      amount: transferAmount,
      entry_type: "debit",
      reference: txnRef,
    });

    await supabase.from("transfers").insert({
      user_id: userId,
      organization_id: organizationId,
      beneficiary_name: beneficiaryName,
      beneficiary_account: accountNumber,
      bank_code: bankCode,
      bank_name: bankName,
      amount: transferAmount,
      reference: txnRef,
      transfer_status: "pending",
      narration: narration || "Bank Transfer",
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      organization_id: organizationId,
      title: "Transfer Initiated",
      message: `₦${amount} transfer to ${beneficiaryName} initiated`,
    });

    try {
      const token = await getNombaToken();

      const transferResponse = await fetch(
        "https://api.nomba.com/v1/transfers/bank",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            bankCode,
            accountNumber,
            accountName: beneficiaryName,
            senderName: "Generis Wallet",
            narration: narration || "Wallet withdrawal",
            merchantTxRef: txnRef,
          }),
        }
      );

      const nombaResult = await transferResponse.json();

      if (!transferResponse.ok) {
        await supabase.rpc("credit_wallet", {
          p_user_id: userId,
          p_amount: amount,
        });

        await supabase
          .from("transfers")
          .update({ transfer_status: "failed" })
          .eq("reference", txnRef);

        await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("reference", txnRef);

        await supabase.from("notifications").insert({
          user_id: userId,
          organization_id: organizationId,
          title: "Transfer Failed",
          message: `₦${amount} transfer to ${beneficiaryName} rejected by bank — ${nombaResult.description || nombaResult.message || "Unknown error"}`,
        });

        const rejectReason = nombaResult.description || nombaResult.message || "Unknown error";
        await sendEmailNotification(
          supabase, userId,
          "Transfer Failed — Bank Rejected",
          `<p>Your transfer of <strong>₦${amount}</strong> to <strong>${beneficiaryName}</strong> was rejected by the bank.</p><p>Reason: ${rejectReason}</p><p>The amount has been refunded to your wallet.</p>`
        );

        await sendSmsNotification(
          supabase, userId,
          `Transfer of ₦${amount} to ${beneficiaryName} rejected by bank: ${rejectReason}. Amount refunded.`
        );

        return new Response(
          JSON.stringify({ error: "Transfer failed", details: nombaResult }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("transfers")
        .update({
          transfer_status: "success",
          provider_reference: nombaResult.data?.reference || null,
        })
        .eq("reference", txnRef);

      await supabase
        .from("transactions")
        .update({ status: "success" })
        .eq("reference", txnRef);

      await supabase.from("notifications").insert({
        user_id: userId,
        organization_id: organizationId,
        title: "Transfer Successful",
        message: `₦${amount} transferred to ${beneficiaryName} successfully`,
      });

      return new Response(
        JSON.stringify({ success: true, reference: txnRef, data: nombaResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await supabase.rpc("credit_wallet", {
        p_user_id: userId,
        p_amount: amount,
      });

      await supabase
        .from("transfers")
        .update({ transfer_status: "failed" })
        .eq("reference", txnRef);

      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("reference", txnRef);

      await supabase.from("notifications").insert({
        user_id: userId,
        organization_id: organizationId,
        title: "Transfer Failed",
        message: `₦${amount} transfer to ${beneficiaryName} encountered an error — ${errorMessage}`,
      });

      await sendEmailNotification(
        supabase, userId,
        "Transfer Failed — System Error",
        `<p>Your transfer of <strong>₦${amount}</strong> to <strong>${beneficiaryName}</strong> encountered a system error.</p><p>Error: ${errorMessage}</p><p>The amount has been refunded to your wallet.</p>`
      );

      return new Response(
        JSON.stringify({ error: "Transfer failed", details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await supabase.from("notifications").insert({
      user_id: userId,
      organization_id: organizationId,
      title: "Transfer Error",
      message: `Transfer request failed — ${errorMessage}`,
    });

    await sendEmailNotification(
      supabase, userId,
      "Transfer Request Failed",
      `<p>Your transfer request could not be processed.</p><p>Error: ${errorMessage}</p>`
    );

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
