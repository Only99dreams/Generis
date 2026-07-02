import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const NOMBA_API_URL = Deno.env.get("NOMBA_API_URL") || "https://api.nomba.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const tokenRes = await fetch(`${NOMBA_API_URL}/auth/token/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")! },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("NOMBA_CLIENT_ID"),
        client_secret: Deno.env.get("NOMBA_CLIENT_SECRET"),
      }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.data?.access_token;
    if (!token) {
      return new Response(JSON.stringify({ error: "Auth failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch(`${NOMBA_API_URL}/transfers/banks`, {
      headers: { Authorization: `Bearer ${token}`, "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")! },
    });
    const result = await response.json();

    if (result.code !== "00") {
      return new Response(JSON.stringify({ error: result.description, debug: result }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let banks = [];
    if (Array.isArray(result.data)) {
      banks = result.data;
    } else if (result.data?.results) {
      banks = result.data.results;
    }
    return new Response(JSON.stringify({ success: true, banks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
