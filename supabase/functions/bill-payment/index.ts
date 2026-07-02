import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getNombaToken() {
  const response = await fetch("https://api.nomba.com/v1/auth/token/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json", "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")! },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("NOMBA_CLIENT_ID"),
      client_secret: Deno.env.get("NOMBA_CLIENT_SECRET"),
    }),
  });
  const data = await response.json();
  return data.data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization") || "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { type, ...payload } = await req.json();
    const token = await getNombaToken();

    let endpoint = "";
    let nombaPayload: Record<string, unknown> = {};

    if (type === "airtime") {
      endpoint = "https://api.nomba.com/v1/bill/topup";
      nombaPayload = {
        amount: payload.amount,
        phoneNumber: payload.phoneNumber,
        network: payload.network.toUpperCase(),
        merchantTxRef: `air_${user.id.slice(0, 8)}_${Date.now()}`,
        senderName: payload.senderName || user.email,
      };
    } else if (type === "data") {
      endpoint = "https://api.nomba.com/v1/bill/data";
      nombaPayload = {
        amount: payload.amount,
        phoneNumber: payload.phoneNumber,
        network: payload.network.toUpperCase(),
        merchantTxRef: `dat_${user.id.slice(0, 8)}_${Date.now()}`,
      };
    } else if (type === "electricity") {
      endpoint = "https://api.nomba.com/v1/bill/electricity";
      nombaPayload = {
        disco: payload.disco,
        merchantTxRef: `elec_${user.id.slice(0, 8)}_${Date.now()}`,
        payerName: payload.payerName || user.email,
        amount: payload.amount,
        customerId: payload.customerId,
        meterType: payload.meterType || "PREPAID",
      };
    } else {
      return new Response(JSON.stringify({ error: "Invalid bill type. Use: airtime, data, electricity" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nombaPayload),
    });

    const nomba = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: nomba }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: debited } = await supabase.rpc("debit_wallet", {
      p_user_id: user.id,
      p_amount: payload.amount,
    });

    if (!debited) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("transactions").insert({
      user_id: user.id,
      transaction_type: "withdrawal",
      amount: payload.amount,
      reference: nombaPayload.merchantTxRef,
      status: nomba.data?.status === "SUCCESS" ? "success" : "pending",
      category: `bill_${type}`,
      narration: `${type} - ${payload.phoneNumber || payload.customerId}`,
      metadata: { provider: "nomba", type, ...nomba.data },
    });

    return new Response(JSON.stringify({ success: true, data: nomba.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
