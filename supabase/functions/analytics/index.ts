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
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { organizationId } = await req.json();

  if (!organizationId) {
    return new Response(
      JSON.stringify({ error: "organizationId required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  const { data: totalCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { data: activeAccounts } = await supabase
    .from("virtual_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  const { data: totalRevenue } = await supabase
    .from("transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("transaction_type", "deposit")
    .eq("status", "success");

  const { data: outstandingInvoices } = await supabase
    .from("invoices")
    .select("amount, amount_paid")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "partial"]);

  const { data: totalTransfers } = await supabase
    .from("transfers")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("transfer_status", "success");

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const revenue =
    totalRevenue?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const transfersOut =
    totalTransfers?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const outstanding =
    outstandingInvoices?.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid || 0)),
      0
    ) || 0;
  const totalInvoiced =
    outstandingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) ||
    0;
  const collectionRate =
    totalInvoiced > 0
      ? Math.round(((totalInvoiced - outstanding) / totalInvoiced) * 100)
      : 0;
  const customerCount = totalCustomers?.length || 0;
  const activeAccountCount = activeAccounts?.length || 0;

  return new Response(
    JSON.stringify({
      balance: wallet?.available_balance || 0,
      totalCustomers: customerCount,
      activeAccounts: activeAccountCount,
      totalRevenue: revenue,
      totalTransfers: transfersOut,
      outstanding,
      collectionRate,
      recentTransactions: recentTransactions || [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
