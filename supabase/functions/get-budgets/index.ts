import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: { user } } = await supabase.auth.getUser(token);
    const userId = user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organizationId } = await req.json().catch(() => ({}));

    let query = supabase.from("budgets").select("*");
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    } else {
      query = query.eq("user_id", userId).is("organization_id", null);
    }

    const { data: budgets } = await query;

    if (!budgets || budgets.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstOfWeek = new Date(now);
    firstOfWeek.setDate(now.getDate() - now.getDay());
    firstOfWeek.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const updated = [];

    for (const budget of budgets) {
      let sinceDate: string;
      switch (budget.period) {
        case "weekly":
          sinceDate = firstOfWeek.toISOString();
          break;
        case "yearly":
          sinceDate = startOfYear;
          break;
        default:
          sinceDate = firstOfMonth;
      }

      let txQuery = supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", sinceDate);

      if (budget.category !== "all") {
        txQuery = txQuery.eq("category", budget.category);
      } else {
        txQuery = txQuery.in("transaction_type", ["debit", "transfer", "withdrawal"]);
      }

      const { data: txs } = await txQuery;
      const spent = (txs || []).reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const { data: upd } = await supabase
        .from("budgets")
        .update({ spent, updated_at: new Date().toISOString() })
        .eq("id", budget.id)
        .select()
        .single();

      if (upd) updated.push(upd);
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
