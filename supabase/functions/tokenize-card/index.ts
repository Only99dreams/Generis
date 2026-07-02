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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, cardNumber, expMonth, expYear, cvv, cardName } = await req.json();

    if (!userId || !cardNumber || !expMonth || !expYear || !cvv) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, cardNumber, expMonth, expYear, cvv" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getNombaToken();

    const response = await fetch(
      "https://api.nomba.com/v1/checkout/tokenize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          expMonth,
          expYear,
          cvv,
          cardName: cardName || "",
          currency: "NGN",
        }),
      }
    );

    const nomba = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: nomba }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cardData = nomba.data;

    const { data, error } = await supabase
      .from("saved_cards")
      .insert({
        user_id: userId,
        card_brand: cardData.brand || "unknown",
        last4: cardData.last4 || cardNumber.slice(-4),
        exp_month: expMonth,
        exp_year: expYear,
        card_type: cardData.cardType || "debit",
        provider_ref: cardData.token || cardData.reference,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
