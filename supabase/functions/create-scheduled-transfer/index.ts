import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextRun(startDate: string, frequency: string, intervalDay?: number, intervalWeekday?: number): string {
  const now = new Date();
  const start = new Date(startDate);

  switch (frequency) {
    case "once":
      return start > now ? start.toISOString() : now.toISOString();

    case "daily": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next.toISOString();
    }

    case "weekly": {
      const targetDay = intervalWeekday !== undefined ? intervalWeekday : 1;
      const next = new Date(now);
      next.setHours(8, 0, 0, 0);
      while (next.getDay() !== targetDay) {
        next.setDate(next.getDate() + 1);
      }
      if (next <= now) next.setDate(next.getDate() + 7);
      return next.toISOString();
    }

    case "monthly": {
      const targetDay = intervalDay || 1;
      let next = new Date(now.getFullYear(), now.getMonth(), targetDay, 8, 0, 0, 0);
      if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, 8, 0, 0, 0);
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

    const { beneficiaryName, beneficiaryAccount, bankCode, bankName, amount, narration, frequency, intervalDay, intervalWeekday, startDate, endDate, organizationId } = await req.json();

    if (!beneficiaryName || !beneficiaryAccount || !bankCode || !bankName || !amount || !frequency) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", user.id)
      .single();

    if (!wallet) {
      return new Response(JSON.stringify({ error: "No wallet found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet.available_balance < amount && frequency === "once") {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextRun = computeNextRun(startDate || new Date().toISOString().split("T")[0], frequency, intervalDay, intervalWeekday);

    const { data, error } = await supabase
      .from("scheduled_transfers")
      .insert({
        user_id: user.id,
        organization_id: organizationId || null,
        beneficiary_name: beneficiaryName,
        beneficiary_account: beneficiaryAccount,
        bank_code: bankCode,
        bank_name: bankName,
        amount,
        narration: narration || "",
        frequency,
        interval_day: frequency === "monthly" ? (intervalDay || 1) : null,
        interval_weekday: frequency === "weekly" ? (intervalWeekday || 1) : null,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        next_run: nextRun,
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
