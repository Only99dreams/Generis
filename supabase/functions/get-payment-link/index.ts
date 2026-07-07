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
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");

    if (!ref) {
      return new Response(JSON.stringify({ error: "Missing ref parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error } = await supabase
      .from("payment_links")
      .select("*, virtual_accounts(account_number, account_name, bank_name)")
      .eq("reference", ref)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ error: "Payment link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.status !== "active") {
      return new Response(JSON.stringify({ error: "Payment link is no longer active", status: link.status }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Payment link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ownerName = "Generis User";
    if (link.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", link.user_id)
        .maybeSingle();
      if (profile?.full_name) ownerName = profile.full_name;
    }
    if (link.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", link.organization_id)
        .maybeSingle();
      if (org?.name) ownerName = org.name;
    }

    return new Response(JSON.stringify({
      success: true,
      data: { ...link, owner_name: ownerName },
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
