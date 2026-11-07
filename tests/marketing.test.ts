import { describe, expect, it } from "vitest";
import { marketingRange, outreachInput, publicWebsite, requireMarketingAdmin } from "../src/lib/stillframe/marketing";
import { deliverMarketingEmail, marketingRawEmail, marketingSendInput } from "../src/lib/stillframe/marketing-send";

describe("Marketing Hub safeguards", () => {
  it("requires a verified staff role", () => {
    expect(() => requireMarketingAdmin({ data: false, error: null })).toThrow();
    expect(() => requireMarketingAdmin({ data: true, error: new Error() })).toThrow();
    expect(() => requireMarketingAdmin({ data: true, error: null })).not.toThrow();
  });
  it("rejects private or credential-bearing website inputs", () => {
    for (const value of ["http://localhost", "https://127.0.0.1", "https://[::1]", "https://user:pass@shop.com", "https://shop.internal", "https://shop.com:8080", "https://127.0.0.1.nip.io"]) expect(publicWebsite.safeParse(value).success).toBe(false);
    expect(publicWebsite.parse("purlsoho.com")).toBe("https://purlsoho.com");
  });
  it("bounds staff notes before generation", () => {
    expect(outreachInput.safeParse({ website: "purlsoho.com", brand: "Purl Soho", offer: "try_app", notes: "a".repeat(2001) }).success).toBe(false);
  });
  it("includes seven whole UTC dates, ending with today", () => {
    expect(marketingRange(7, new Date("2026-11-07T17:48:00Z"))).toEqual({ from: "2026-11-01T00:00:00.000Z", to: "2026-11-08T00:00:00.000Z" });
  });
});

const invitation = { requestId: "10000000-0000-4000-8000-000000000001", to: "brand@example.com", subject: "Invitation à Aimanté", body: "Hello — a personal invitation.", approved: true as const };

describe("Approved Marketing Hub sending", () => {
  it("requires explicit approval before calling delivery", async () => {
    let sends = 0;
    await expect(deliverMarketingEmail({ ...invitation, approved: false } as unknown as typeof invitation, { claim: async () => true, send: async () => { sends++; return "id"; }, finish: async () => {} })).rejects.toThrow();
    expect(sends).toBe(0);
  });
  it("accepts exactly one recipient and rejects injected headers", () => {
    expect(marketingSendInput.safeParse({ ...invitation, to: "a@example.com,b@example.com" }).success).toBe(false);
    expect(marketingSendInput.safeParse({ ...invitation, subject: "Hello\r\nBcc: other@example.com" }).success).toBe(false);
    expect(marketingSendInput.safeParse(invitation).success).toBe(true);
  });
  it("sends once and blocks concurrent or repeated attempts sharing the approval ID", async () => {
    let claimed = false, sends = 0;
    const deps = { claim: async () => { if (claimed) return false; claimed = true; return true; }, send: async () => { sends++; return "gmail-id"; }, finish: async () => {} };
    const results = await Promise.all([deliverMarketingEmail(invitation, deps), deliverMarketingEmail(invitation, deps)]);
    expect(results.map((r) => r.status).sort()).toEqual(["blocked", "sent"]);
    expect(sends).toBe(1);
  });
  it("does not retry uncertain provider outcomes", async () => {
    let sends = 0;
    const results: string[] = [];
    const result = await deliverMarketingEmail(invitation, { claim: async () => true, send: async () => { sends++; throw new Error("timeout"); }, finish: async (status) => { results.push(status); } });
    expect(result.status).toBe("unknown"); expect(sends).toBe(1); expect(results).toEqual(["unknown"]);
  });
  it("encodes the approved recipient, unicode subject and exact body safely", () => {
    const raw = marketingRawEmail(invitation);
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
    expect(decoded).toContain("To: brand@example.com\r\n");
    expect(decoded).toContain("Subject: =?UTF-8?B?");
    expect(decoded.endsWith(invitation.body)).toBe(true);
  });
});