import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { subWalletId, amount, note } = await req.json();
    if (!subWalletId || !amount || amount <= 0) return new Response(JSON.stringify({ error: "Invalid subWalletId or amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: sub } = await supabase.from("sub_wallets").select("*").eq("id", subWalletId).eq("user_id", user.id).single();
    if (!sub) return new Response(JSON.stringify({ error: "Sub-wallet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (Number(sub.current_balance) < amount) return new Response(JSON.stringify({ error: "Insufficient sub-wallet balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const newSubBalance = Number(sub.current_balance) - Number(amount);
    await supabase.from("sub_wallets").update({ current_balance: newSubBalance, updated_at: new Date().toISOString() }).eq("id", subWalletId);

    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).is("organization_id", null).single();
    if (wallet) {
      const newBalance = Number(wallet.available_balance) + Number(amount);
      await supabase.from("wallets").update({ available_balance: newBalance, updated_at: new Date().toISOString() }).eq("id", wallet.id);
    }

    const ref = `SUB-WITH-${subWalletId.slice(0, 8)}-${Date.now()}`;
    await supabase.from("transactions").insert({
      user_id: user.id,
      transaction_type: "credit",
      amount,
      reference: ref,
      status: "completed",
      category: "savings",
      narration: note || `Withdrew from ${sub.name}`,
      metadata: { sub_wallet_id: subWalletId, sub_wallet_name: sub.name, transfer_type: "withdraw" },
    });

    return new Response(JSON.stringify({ success: true, data: { balance: newSubBalance, reference: ref } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
