const NOMBA_API_URL = Deno.env.get("NOMBA_API_URL") || "https://api.nomba.com/v1";

export async function getNombaToken() {
  const response = await fetch(
    `${NOMBA_API_URL}/auth/token/issue`,
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
