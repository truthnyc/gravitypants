import { afterEach, describe, expect, it, vi } from "vitest";
import { campaignContentUrl, campaignHtml } from "../src/lib/stillframe/marketing-campaign";
import { sendCampaign } from "../src/lib/stillframe/marketing-campaign.server";

const input = { clientId: "a".repeat(32), listId: "b".repeat(32), fromName: "Gravity Pants", fromEmail: "info@gravitypants.com", replyTo: "info@gravitypants.com", confirmationEmail: "info@gravitypants.com", subject: "Test invitation", body: "Approved test message", permissionConfirmed: true as const };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Campaign content availability", () => {
  it("uses the preview deployment for preview sends and production for live sends", () => {
    expect(campaignContentUrl("http://localhost:8080", "review", "token")).toBe("https://project--4f242291-4ce3-4b10-9afe-98cd7661d4c7-dev.lovable.app/api/public/marketing-campaign/review?token=token");
    expect(campaignContentUrl("https://gravitypants.com", "review", "token")).toBe("https://project--4f242291-4ce3-4b10-9afe-98cd7661d4c7.lovable.app/api/public/marketing-campaign/review?token=token");
  });
  it("does not create or send a campaign when HTML is missing", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(sendCampaign(input, "review", "https://content.example/test", async () => {})).rejects.toThrow("content is unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects a login page instead of approved email content", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("<html>Sign in</html>", { headers: { "Content-Type": "text/html" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(sendCampaign(input, "review", "https://content.example/test", async () => {})).rejects.toThrow("content is unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("imports the verified HTML URL and sends only after storing the campaign receipt", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key"); vi.stubEnv("UDC_CAMPAIGN_MONITOR_API_KEY", "test-connection");
    const id = "c".repeat(32), events: string[] = [];
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      if (!init?.body) return new Response(campaignHtml(input), { headers: { "Content-Type": "text/html" } });
      const body = JSON.parse(init.body);
      if (body.HtmlUrl) { events.push("create"); return new Response(JSON.stringify(id)); }
      events.push("send"); return new Response("");
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await sendCampaign(input, "review", "https://content.example/test", async () => { events.push("receipt"); })).toBe(id);
    expect(events).toEqual(["create", "receipt", "send"]);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).HtmlUrl).toBe("https://content.example/test");
  });
});