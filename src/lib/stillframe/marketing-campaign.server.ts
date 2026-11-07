import { campaignHtml, type CampaignInput } from "./marketing-campaign";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/udc_campaign_monitor";
type Client = { ClientID: string; Name: string };
type List = { ListID: string; Name: string };
async function cm<T>(path: string, body?: object): Promise<T> {
  const key = process.env['LOVABLE_API_KEY'];
  const connection = process.env['UDC_CAMPAIGN_MONITOR_API_KEY'];
  if (!key || !connection) throw new Error("Connect Campaign Monitor before sending campaigns.");
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Campaign Monitor request failed [${response.status}]: ${detail}`);
    throw new Error(`Campaign Monitor request failed [${response.status}]: ${detail}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
export async function campaignOptions() {
  const clients = await cm<Client[]>("/clients.json");
  return Promise.all(clients.map(async (client) => ({ id: client.ClientID, name: client.Name,
    lists: (await cm<List[]>(`/clients/${client.ClientID}/lists.json`)).map((list) => ({ id: list.ListID, name: list.Name })),
  })));
}
export async function campaignAudience(input: CampaignInput) {
  const clients = await campaignOptions();
  const client = clients.find((item) => item.id === input.clientId);
  const list = client?.lists.find((item) => item.id === input.listId);
  if (!client || !list) throw new Error("Choose an existing list from the connected Campaign Monitor account.");
  const stats = await cm<{ TotalActiveSubscribers: number }>(`/lists/${list.id}/stats.json`);
  if (!Number.isInteger(stats.TotalActiveSubscribers) || stats.TotalActiveSubscribers <= 0) throw new Error("This list has no active subscribers.");
  return { clientName: client.name, listName: list.name, recipients: stats.TotalActiveSubscribers };
}
export async function sendCampaign(input: CampaignInput, requestId: string, contentUrl: string, onCreated: (id: string) => Promise<void>) {
  // Confirm the exact approved HTML is public before asking Campaign Monitor to import it.
  const content = await fetch(contentUrl, { signal: AbortSignal.timeout(15000), redirect: "manual" });
  const receivedHtml = await content.text();
  const approvedBody = campaignHtml(input).match(/<body>([\s\S]*)<\/body>/i)?.[1];
  const receivedBody = receivedHtml.match(/<body>([\s\S]*)<\/body>/i)?.[1];
  if (!content.ok || !content.headers.get("content-type")?.includes("text/html") || !approvedBody || receivedBody !== approvedBody) {
    console.error(`Campaign content preflight failed: ${content.status}, ${content.headers.get("content-type") ?? "no content type"}`);
    throw new Error("Campaign email content is unavailable on this site. No Campaign Monitor draft was created or sent.");
  }
  const id = await cm<string>(`/campaigns/${input.clientId}.json`, {
    Name: `Marketing Hub ${requestId}`, Subject: input.subject, FromName: input.fromName, FromEmail: input.fromEmail,
    ReplyTo: input.replyTo, HtmlUrl: contentUrl, ListIDs: [input.listId], InlineCss: true,
  });
  if (typeof id !== "string" || !/^[a-f0-9]{32}$/i.test(id)) throw new Error("Campaign Monitor did not confirm campaign creation.");
  await onCreated(id);
  // No preview email, list imports or resubscribe operations are performed.
  await cm(`/campaigns/${id}/send.json`, { ConfirmationEmail: input.confirmationEmail, SendDate: "Immediately" });
  return id;
}
export async function hashCampaignToken(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export { campaignHtml };