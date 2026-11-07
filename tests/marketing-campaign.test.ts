import { describe, expect, it } from "vitest";
import { campaignHtml, campaignInput, checkCampaignAudience, deliverCampaign } from "../src/lib/stillframe/marketing-campaign";

const input = { clientId: "a".repeat(32), listId: "b".repeat(32), fromName: "Gravity Pants", fromEmail: "sender@example.com", replyTo: "reply@example.com", confirmationEmail: "confirmation@example.com", subject: "Approved invitation", body: "Hello <script>alert(1)</script>\n\nSecond paragraph.", permissionConfirmed: true as const };
const approval = { requestId: "10000000-0000-4000-8000-000000000001", approved: true as const };
describe("Campaign Monitor approval safeguards", () => {
  it("requires explicit final approval before any delivery", async () => {
    let calls = 0;
    await expect(deliverCampaign({ ...approval, approved: false }, { claim: async () => { calls++; return true; }, send: async () => { calls++; return "id"; }, finish: async () => {} })).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it("requires a selected existing-list identifier and marketing permission", () => {
    expect(campaignInput.safeParse({ ...input, listId: "" }).success).toBe(false);
    expect(campaignInput.safeParse({ ...input, permissionConfirmed: false }).success).toBe(false);
    expect(campaignInput.safeParse(input).success).toBe(true);
  });
  it("blocks concurrent duplicate attempts", async () => {
    let claimed = false, sends = 0;
    const deps = { claim: async () => { if (claimed) return false; claimed = true; return true; }, send: async () => { sends++; return "campaign-id"; }, finish: async () => {} };
    const result = await Promise.all([deliverCampaign(approval, deps), deliverCampaign(approval, deps)]);
    expect(result.map((item) => item.status).sort()).toEqual(["accepted", "blocked"]);
    expect(sends).toBe(1);
  });
  it("does not retry uncertain sends and preserves provider error details", async () => {
    let sends = 0;
    const result = await deliverCampaign(approval, { claim: async () => true, send: async () => { sends++; throw new Error("Campaign Monitor [400]: Payment Details Required"); }, finish: async () => {} });
    expect(result.status).toBe("unknown"); expect(result.message).toContain("[400]: Payment Details Required"); expect(sends).toBe(1);
  });
  it("requires renewed approval when the audience changes or review expires", () => {
    const review = { requestId: approval.requestId, input, clientName: "Gravity Pants", listName: "Brands", recipients: 36, expiresAt: new Date(Date.now() + 600000).toISOString() };
    expect(() => checkCampaignAudience(review, "Brands", 37)).toThrow();
    expect(() => checkCampaignAudience({ ...review, expiresAt: "2020-01-01T00:00:00Z" }, "Brands", 36)).toThrow();
    expect(() => checkCampaignAudience(review, "Brands", 36)).not.toThrow();
  });
  it("rejects header injection in sender fields", () => {
    expect(campaignInput.safeParse({ ...input, fromName: "Brand\r\nBcc: other@example.com" }).success).toBe(false);
  });
  it("escapes draft HTML without executing supplied content", () => {
    const html = campaignHtml(input);
    expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;");
  });
});