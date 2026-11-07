import { z } from "zod";

const email = z.string().trim().email().max(254).refine((value) => !/[\r\n]/.test(value));
export const campaignInput = z.object({
  clientId: z.string().regex(/^[a-f0-9]{32}$/i), listId: z.string().regex(/^[a-f0-9]{32}$/i),
  fromName: z.string().trim().min(1).max(100).refine((value) => !/[\r\n]/.test(value)),
  fromEmail: email, replyTo: email, confirmationEmail: email,
  subject: z.string().trim().min(1).max(200).refine((value) => !/[\r\n]/.test(value)),
  body: z.string().trim().min(1).max(5000), permissionConfirmed: z.literal(true),
});
export type CampaignInput = z.infer<typeof campaignInput>;
export const campaignApprovalInput = z.object({ requestId: z.string().uuid(), approved: z.literal(true) });
export type CampaignReview = { requestId: string; input: CampaignInput; clientName: string; listName: string; recipients: number; expiresAt: string };
export type CampaignResult = { status: "accepted" | "blocked" | "unknown"; message: string; campaignId?: string };
export function campaignContentUrl(requestOrigin: string, requestId: string, token: string) {
  const host = new URL(requestOrigin).hostname;
  const productionHosts = ["gravitypants.com", "www.gravitypants.com", "gravitypants.lovable.app", "aimante.co", "www.aimante.co", "project--4f242291-4ce3-4b10-9afe-98cd7661d4c7.lovable.app"];
  const origin = productionHosts.includes(host)
    ? "https://project--4f242291-4ce3-4b10-9afe-98cd7661d4c7.lovable.app"
    : "https://project--4f242291-4ce3-4b10-9afe-98cd7661d4c7-dev.lovable.app";
  return `${origin}/api/public/marketing-campaign/${requestId}?token=${encodeURIComponent(token)}`;
}
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export function campaignHtml(input: CampaignInput) {
  const safe = campaignInput.parse(input);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(safe.subject)}</title></head><body>${safe.body.split(/\n\s*\n/).map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, "<br>")}</p>`).join("")}<p><unsubscribe>Unsubscribe</unsubscribe></p></body></html>`;
}
export function checkCampaignAudience(review: CampaignReview, listName: string, recipients: number) {
  if (!recipients || recipients !== review.recipients || listName !== review.listName) throw new Error("The selected audience changed. Review the campaign again before sending.");
  if (Date.parse(review.expiresAt) <= Date.now()) throw new Error("This review expired. Review the campaign again before sending.");
}
export async function deliverCampaign(approval: unknown, deps: {
  claim: () => Promise<boolean>; send: () => Promise<string>;
  finish: (status: "accepted" | "unknown", campaignId?: string) => Promise<void>;
}): Promise<CampaignResult> {
  campaignApprovalInput.parse(approval);
  if (!await deps.claim()) return { status: "blocked", message: "This campaign was already attempted. Check Campaign Monitor before sending again." };
  try {
    const campaignId = await deps.send();
    await deps.finish("accepted", campaignId);
    return { status: "accepted", campaignId, message: "Campaign Monitor accepted the campaign for sending. Delivery results will appear in Campaign Monitor." };
  } catch (error) {
    await deps.finish("unknown").catch(() => undefined);
    return { status: "unknown", message: `${error instanceof Error ? error.message : "Sending could not be confirmed."} Check Campaign Monitor before trying again; no automatic retry will occur.` };
  }
}