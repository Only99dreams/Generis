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
    const { paymentLinkReference, customerEmail, callbackUrl } = await req.json();

    if (!paymentLinkReference || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: paymentLinkReference, customerEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error: linkError } = await supabase
      .from("payment_links")
      .select("*")
      .eq("reference", paymentLinkReference)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Payment link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.status !== "active") {
      return new Response(JSON.stringify({ error: "Payment link is no longer active" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getNombaToken();

    const orderRef = paymentLinkReference;
    const amount = link.amount ? link.amount.toFixed(2) : "0.00";

    const response = await fetch(
      `${NOMBA_API_URL}/checkout/order`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: {
            orderReference: orderRef,
            amount,
            currency: "NGN",
            customerEmail,
            callbackUrl: callbackUrl || "https://fyetcyvhpmuphfesyguc.supabase.co/functions/v1/nomba-webhook",
          },
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

    return new Response(JSON.stringify({
      success: true,
      data: {
        checkoutLink: nomba.data.checkoutLink,
        orderReference: nomba.data.orderReference,
      },
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
