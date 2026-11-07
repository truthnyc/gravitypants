import { describe, expect, it } from "vitest";
import { marketingRange, outreachInput, publicWebsite, requireMarketingAdmin } from "../src/lib/stillframe/marketing";

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