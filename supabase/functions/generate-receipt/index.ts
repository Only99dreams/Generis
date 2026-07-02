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

  const { paymentId } = await req.json();

  if (!paymentId) {
    return new Response(JSON.stringify({ error: "paymentId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*, customers(*), invoices(*), organizations(name)")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    return new Response(JSON.stringify({ error: "Payment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const receiptNumber = `RCP-${Date.now()}`;

  const { data: receipt } = await supabase
    .from("receipts")
    .insert({
      payment_id: paymentId,
      receipt_number: receiptNumber,
    })
    .select()
    .single();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 24px; color: #1a1a2e; }
    .header p { color: #6b7280; font-size: 14px; margin-top: 4px; }
    .receipt-num { font-size: 13px; color: #9ca3af; margin-top: 8px; }
    .details { margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
    .amount-row { font-size: 18px; padding: 12px 0; border-top: 2px solid #1a1a2e; margin-top: 8px; }
    .amount-row .value { color: #16a34a; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af; }
    .divider { border: none; border-top: 1px dashed #d1d5db; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${payment.organizations?.name || "Generis Wallet"}</h1>
    <p>Payment Receipt</p>
    <div class="receipt-num">${receiptNumber}</div>
  </div>

  <hr class="divider" />

  <div class="details">
    <div class="row">
      <span class="label">Customer</span>
      <span class="value">${payment.customers?.full_name || "N/A"}</span>
    </div>
    <div class="row">
      <span class="label">Invoice</span>
      <span class="value">${payment.invoices?.invoice_number || "N/A"}</span>
    </div>
    <div class="row">
      <span class="label">Reference</span>
      <span class="value">${payment.reference || "N/A"}</span>
    </div>
    <div class="row">
      <span class="label">Channel</span>
      <span class="value">${payment.payment_channel || "N/A"}</span>
    </div>
    <div class="row">
      <span class="label">Date</span>
      <span class="value">${new Date(payment.paid_at || payment.created_at).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
    </div>
    <div class="row amount-row">
      <span class="label">Amount Paid</span>
      <span class="value">₦${Number(payment.amount).toLocaleString()}</span>
    </div>
  </div>

  <hr class="divider" />

  <div class="footer">
    <p>Thank you for your payment</p>
    <p>Generis Wallet &middot; Powered by Nomba</p>
  </div>
</body>
</html>`;

  return new Response(JSON.stringify({ receipt, html, receipt_number: receiptNumber }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
