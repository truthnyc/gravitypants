import { describe, expect, it } from "vitest";
import { gtmScriptUrl } from "@/lib/site/gtm";

// The real container ID is filled in by hand, so these checks pass one explicitly:
// what matters is which pages the container is allowed to load on.
const ID = "GTM-TEST01";

describe("Tag Manager container placement", () => {
  it("loads on public marketing pages", () => {
    expect(gtmScriptUrl("gravitypants.com", "/", ID)).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TEST01");
    expect(gtmScriptUrl("www.gravitypants.com", "/how-it-works", ID)).toContain("gtm.js?id=GTM-TEST01");
  });

  it("stays off the app, staff tools, embedded players and the API", () => {
    for (const path of ["/app/ads", "/admin", "/shopify/welcome", "/embed/reel/abc", "/api/public/weekly-report"]) {
      expect(gtmScriptUrl("gravitypants.com", path, ID)).toBeNull();
    }
  });

  it("stays off Aimanté, sign-in pages and other hosts", () => {
    expect(gtmScriptUrl("aimante.co", "/", ID)).toBeNull();
    expect(gtmScriptUrl("gravitypants.com", "/directory/ippawards", ID)).toBeNull();
    expect(gtmScriptUrl("gravitypants.com", "/signin", ID)).toBeNull();
    expect(gtmScriptUrl("id-preview--abc.lovable.app", "/", ID)).toBeNull();
  });

  it("stays off entirely while the container ID is empty", () => {
    expect(gtmScriptUrl("gravitypants.com", "/")).toBeNull();
  });
});
