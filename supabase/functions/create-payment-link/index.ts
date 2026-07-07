import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateReference(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "PL-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

    const { amount, description } = await req.json();

    let vaId: string | null = null;
    const { data: existingVa } = await supabase
      .from("virtual_accounts")
      .select("id")
      .eq("user_id", user.id)
      .is("organization_id", null)
      .eq("status", "active")
      .maybeSingle();

    if (existingVa) {
      vaId = existingVa.id;
    }

    const reference = generateReference();
    const origin = req.headers.get("origin") || "https://fyetcyvhpmuphfesyguc.supabase.co";

    const { data: link, error: insertError } = await supabase
      .from("payment_links")
      .insert({
        reference,
        user_id: user.id,
        virtual_account_id: vaId,
        amount: amount || null,
        description: description || null,
      })
      .select("*, virtual_accounts(account_number, bank_name, account_name)")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...link,
        url: `${origin}/pay/${reference}`,
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
