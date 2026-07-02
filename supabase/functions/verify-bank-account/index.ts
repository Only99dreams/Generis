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
  return data.data?.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountNumber, bankCode, bankName, userId, organizationId } = await req.json();
    if (!accountNumber || !bankCode) {
      return new Response(JSON.stringify({ error: "accountNumber and bankCode required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = await getNombaToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "Failed to authenticate with Nomba" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://api.nomba.com/v1/transfers/bank/lookup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountNumber, bankCode }),
    });

    const result = await response.json();

    if (result.code !== "00") {
      if (userId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const bankLabel = bankName || bankCode;
        await supabase.from("notifications").insert({
          user_id: userId,
          organization_id: organizationId || null,
          title: "Account Lookup Failed",
          message: `Account ${accountNumber} (${bankLabel}) could not be verified — ${result.description || "Account not found"}`,
        });
      }

      return new Response(JSON.stringify({ error: result.description || "Account lookup failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, accountName: result.data?.accountName, accountNumber: result.data?.accountNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
