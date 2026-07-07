import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const NOMBA_API_URL = Deno.env.get("NOMBA_API_URL") || "https://api.nomba.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getNombaToken() {
  const response = await fetch(
    `${NOMBA_API_URL}/auth/token/issue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
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

function computeNextBilling(subscription: any): string {
  const next = new Date(subscription.next_billing_date);

  switch (subscription.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    const { data: subscriptions, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*, saved_cards(provider_ref, card_brand, last4)")
      .eq("status", "active")
      .lte("next_billing_date", now)
      .order("next_billing_date", { ascending: true });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    const token = await getNombaToken();

    for (const sub of subscriptions) {
      const tokenKey = sub.saved_cards?.provider_ref;
      if (!tokenKey) {
        failed++;
        await supabase.from("subscription_logs").insert({
          subscription_id: sub.id,
          status: "failed",
          amount: sub.amount,
          error_message: "Card has no token",
        });
        continue;
      }

      try {
        const chargeResponse = await fetch(
          `${NOMBA_API_URL}/checkout/tokenized-card-payment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tokenKey,
              order: {
                orderReference: `SUB-${sub.id}-${Date.now()}`,
                amount: sub.amount.toFixed(2),
                currency: "NGN",
              },
            }),
          }
        );

        const result = await chargeResponse.json();

        if (chargeResponse.ok) {
          const nextBilling = computeNextBilling(sub);

          await supabase
            .from("subscriptions")
            .update({
              last_billing_date: now,
              next_billing_date: nextBilling,
              total_charges: sub.total_charges + 1,
              total_amount: Number(sub.total_amount) + Number(sub.amount),
              updated_at: now,
            })
            .eq("id", sub.id);

          await supabase.from("subscription_logs").insert({
            subscription_id: sub.id,
            status: "success",
            amount: sub.amount,
            reference: result.data?.transactionId || result.data?.reference || null,
          });

          await supabase.from("notifications").insert({
            user_id: sub.user_id,
            title: "Subscription Charged",
            message: `Your subscription "${sub.name}" was charged ${sub.amount.toFixed(2)} NGN.`,
          });

          processed++;
        } else {
          failed++;

          await supabase.from("subscription_logs").insert({
            subscription_id: sub.id,
            status: "failed",
            amount: sub.amount,
            error_message: result.description || "Card charge failed",
          });

          await supabase.from("notifications").insert({
            user_id: sub.user_id,
            title: "Subscription Payment Failed",
            message: `Failed to charge your card for "${sub.name}". ${result.description || ""}`,
          });
        }
      } catch (chargeErr: any) {
        failed++;
        await supabase.from("subscription_logs").insert({
          subscription_id: sub.id,
          status: "failed",
          amount: sub.amount,
          error_message: chargeErr.message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: subscriptions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
