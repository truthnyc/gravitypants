const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

async function gmail(path: string, body?: object): Promise<Record<string, unknown>> {
  const key = process.env.LOVABLE_API_KEY;
  const connection = process.env.GOOGLE_MAIL_API_KEY;
  if (!key || !connection) throw new Error("Connect Gmail before sending invitations.");
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Gmail request failed [${response.status}]: ${detail}`);
    throw new Error(`Gmail request failed [${response.status}]: ${detail}`);
  }
  return response.json();
}

export async function marketingSender() {
  const profile = await gmail("/users/me/profile");
  if (typeof profile.emailAddress !== "string") throw new Error("Gmail did not return a sender address.");
  return { email: profile.emailAddress };
}

export async function sendMarketingRaw(raw: string) {
  const result = await gmail("/users/me/messages/send", { raw });
  if (typeof result.id !== "string") throw new Error("Gmail did not confirm the message.");
  return result.id;
}