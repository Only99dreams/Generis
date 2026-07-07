import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextRun(plan: any): string {
  const next = new Date(plan.next_run);
  switch (plan.frequency) {
    case "daily": next.setDate(next.getDate() + 1); break;
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
  }
  return next.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    const { data: plans } = await supabase
      .from("savings_plans")
      .select("*, sub_wallets(name, current_balance)")
      .eq("status", "active")
      .lte("next_run", now)
      .order("next_run", { ascending: true });

    if (!plans || plans.length === 0) return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let processed = 0, failed = 0;

    for (const plan of plans) {
      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", plan.user_id).is("organization_id", null).single();
      if (!wallet || wallet.available_balance < plan.amount) {
        failed++;
        await supabase.from("notifications").insert({
          user_id: plan.user_id,
          title: "Auto-Save Failed",
          message: `Could not save ${plan.amount} NGN to "${plan.sub_wallets?.name}" — insufficient balance.`,
        });
        continue;
      }

      const { data: debited } = await supabase.rpc("debit_wallet", { p_user_id: plan.user_id, p_amount: plan.amount });
      if (!debited) { failed++; continue; }

      const newBal = Number(plan.sub_wallets?.current_balance || 0) + Number(plan.amount);
      await supabase.from("sub_wallets").update({ current_balance: newBal, updated_at: now }).eq("id", plan.sub_wallet_id);

      const ref = `SAVE-${plan.id.slice(0, 8)}-${Date.now()}`;
      await supabase.from("transactions").insert({
        user_id: plan.user_id,
        transaction_type: "transfer",
        amount: plan.amount,
        reference: ref,
        status: "completed",
        category: "savings",
        narration: `Auto-save to ${plan.sub_wallets?.name || "savings"}`,
        metadata: { sub_wallet_id: plan.sub_wallet_id, sub_wallet_name: plan.sub_wallets?.name, transfer_type: "fund", auto_save: true },
      });

      const nextRun = computeNextRun(plan);
      await supabase.from("savings_plans").update({
        last_run: now,
        next_run: nextRun,
        total_saved: Number(plan.total_saved) + Number(plan.amount),
        total_executions: plan.total_executions + 1,
        updated_at: now,
      }).eq("id", plan.id);

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed, failed, total: plans.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
