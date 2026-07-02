import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BIN = "539983";

function luhnCheck(digits: string): number {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return (sum * 9) % 10;
}

function generatePAN(userId: string): string {
  const hash = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const middle = parseInt(hash, 16).toString().padStart(8, "0").slice(0, 8);
  const pan15 = BIN + middle;
  const check = luhnCheck(pan15);
  return pan15 + check;
}

function generateCVV(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

function generateExpiry(): { month: string; year: string } {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear() + 3).slice(2);
  return { month, year };
}

function getBrand(pan: string): string {
  if (pan.startsWith("4")) return "visa";
  if (pan.startsWith("5")) return "mastercard";
  if (pan.startsWith("506") || pan.startsWith("650")) return "verve";
  return "mastercard";
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

    const { userId, walletId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pan = generatePAN(userId);
    const cvv = generateCVV();
    const expiry = generateExpiry();
    const last4 = pan.slice(-4);
    const brand = getBrand(pan);
    const providerRef = `gen_${userId.slice(0, 8)}_${Date.now()}`;

    const { data, error } = await supabase
      .from("saved_cards")
      .insert({
        user_id: userId,
        wallet_id: walletId || null,
        card_brand: brand,
        last4,
        exp_month: expiry.month,
        exp_year: expiry.year,
        card_type: "debit",
        pan,
        cvv,
        provider_ref: providerRef,
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
