import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getNombaToken() {
  const response = await fetch(
    "https://api.nomba.com/v1/auth/token/issue",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accountId": Deno.env.get("NOMBA_ACCOUNT_ID")!,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("NOMBA_CLIENT_ID"),
        client_secret: Deno.env.get("NOMBA_CLIENT_SECRET"),
      }),
    }
  );
  const data = await response.json();
  return data.data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let { userId, fullName, organizationId, customerId, orgName } = await req.json();

    userId = userId || null;
    organizationId = organizationId || null;
    customerId = customerId || null;

    const token = await getNombaToken();
    const accountRef = crypto.randomUUID();

    // accountName must not contain special characters per Nomba API (min 8 chars)
    let accountName = fullName.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
    if (accountName.length < 8) {
      accountName = accountName.padEnd(8);
    }

    const response = await fetch(
      "https://api.nomba.com/v1/accounts/virtual",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountRef,
          accountName,
          currency: "NGN",
        }),
      }
    );

    const nomba = await response.json();
    console.log("Nomba create response:", JSON.stringify(nomba));

    if (!response.ok) {
      return new Response(JSON.stringify({ error: nomba }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bankData = nomba.data?.banks?.[0] || nomba.data || {};
    let accountNumber = bankData.bankAccountNumber || bankData.accountNumber || null;
    let bankAccountName = bankData.bankAccountName || bankData.accountName || fullName;
    let bankName = bankData.bankName || "Nombank MFB";

    // Nomba may not return bank details synchronously; fetch them if missing
    if (!accountNumber) {
      const fetchUrl = `https://api.nomba.com/v1/accounts/virtual/${accountRef}`;
      console.log("Fetching VA details from:", fetchUrl);
      const fetchRes = await fetch(fetchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            accountId: Deno.env.get("NOMBA_ACCOUNT_ID")!,
            "Content-Type": "application/json",
          },
        }
      );
      if (fetchRes.ok) {
        const fetched = await fetchRes.json();
        console.log("Nomba fetch response:", JSON.stringify(fetched));
        const fd = fetched.data?.banks?.[0] || fetched.data || {};
        accountNumber = fd.bankAccountNumber || fd.accountNumber || accountNumber;
        bankAccountName = fd.bankAccountName || fd.accountName || bankAccountName;
        bankName = fd.bankName || bankName;
      } else {
        console.log("Nomba fetch failed:", fetchRes.status, await fetchRes.text());
      }
    }

    const { data, error } = await supabase
      .from("virtual_accounts")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        customer_id: customerId,
        account_ref: accountRef,
        account_number: accountNumber,
        account_name: bankAccountName,
        bank_name: bankName,
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
