import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, userId } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const termiiApiKey = Deno.env.get("TERMII_API_KEY");

    if (!termiiApiKey) {
      console.log("send-sms: TERMII_API_KEY not configured, skipping SMS to", to);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "SMS provider not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.termii.com/v1/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: termiiApiKey,
        to,
        from: Deno.env.get("SMS_SENDER_ID") || "Generis",
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      if (userId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "SMS Delivery Failed",
          message: `Failed to send SMS to ${to}: ${result.message || result.error || "Unknown error"}`,
        });
      }

      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.message_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
