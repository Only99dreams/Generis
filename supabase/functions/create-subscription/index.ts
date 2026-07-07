import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextBilling(billingDay: number, frequency: string): string {
  const now = new Date();
  let next: Date;

  switch (frequency) {
    case "monthly": {
      next = new Date(now.getFullYear(), now.getMonth(), billingDay, 9, 0, 0, 0);
      if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, billingDay, 9, 0, 0, 0);
      return next.toISOString();
    }
    case "yearly": {
      next = new Date(now.getFullYear(), 0, billingDay, 9, 0, 0, 0);
      if (next <= now) next = new Date(now.getFullYear() + 1, 0, billingDay, 9, 0, 0, 0);
      return next.toISOString();
    }
    case "weekly": {
      next = new Date(now);
      next.setDate(next.getDate() + (billingDay - next.getDay() + 7) % 7);
      next.setHours(9, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 7);
      return next.toISOString();
    }
    case "daily": {
      next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return next.toISOString();
    }
    default:
      return now.toISOString();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { savedCardId, name, amount, frequency, description, billingDay, organizationId } = await req.json();

    if (!savedCardId || !name || !amount || !frequency) {
      return new Response(JSON.stringify({ error: "Missing required fields: savedCardId, name, amount, frequency" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: card } = await supabase
      .from("saved_cards")
      .select("id, user_id, provider_ref")
      .eq("id", savedCardId)
      .single();

    if (!card || card.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!card.provider_ref) {
      return new Response(JSON.stringify({ error: "Card has no token. Use a tokenized card." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const day = billingDay || new Date().getDate();
    const nextBilling = computeNextBilling(day, frequency);

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        organization_id: organizationId || null,
        saved_card_id: savedCardId,
        name,
        amount,
        frequency,
        description: description || "",
        next_billing_date: nextBilling,
        billing_day: day,
      })
      .select("*, saved_cards(card_brand, last4)")
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
