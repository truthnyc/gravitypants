import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MADE_FOR_LINKS, SEARCH_PAGES } from "@/lib/site/search-pages";

const page = SEARCH_PAGES.find((p) => p.path === "/html5-ads");

describe("HTML5 ads page", () => {
  it("exists with the how-to steps and the three instruction sections", () => {
    expect(page).toBeDefined();
    expect(page!.slug).toBe("html5-ads");
    expect(page!.example.reelId).toBeTruthy();
    // The walkthrough is numbered, so the reader follows it in order.
    expect(page!.section.ordered).toBe(true);
    expect(page!.section.items).toContain("Under Save as, turn on HTML5.");
    expect(page!.extra?.map((s) => s.title)).toEqual(["What is in the zip", "Where to use it", "Before you upload"]);
    expect(page!.extra?.[1].items.some((i) => i.includes("Display & Video 360"))).toBe(true);
  });

  it("matches the export: one banner in the ad's main size, and Google Ads not supported yet", () => {
    const google = page!.faqs.find((f) => f.q === "Will it work on Google Ads?");
    expect(google?.a).toMatch(/Not yet/);
    expect(page!.faqs.some((f) => /main size/.test(f.a))).toBe(true);
    // The walkthrough must not promise a size picker the export does not have.
    expect(page!.section.items.some((i) => /main size/.test(i))).toBe(true);
    expect(page!.section.items.join(" ")).not.toMatch(/Pick the sizes/);
    expect(page!.extra?.[2].items.some((i) => /Google Ads/.test(i))).toBe(true);
  });

  it("is linked from the footer and from Help", () => {
    expect(MADE_FOR_LINKS).toContainEqual({ label: "HTML5 ads", to: "/html5-ads" });
    expect(readFileSync("src/routes/help.tsx", "utf8")).toContain('to="/html5-ads"');
  });

  it("has a route file and a sitemap entry", () => {
    expect(existsSync("src/routes/html5-ads.tsx")).toBe(true);
    expect(readFileSync("src/routes/sitemap[.]xml.ts", "utf8")).toContain('path: "/html5-ads"');
  });
});
