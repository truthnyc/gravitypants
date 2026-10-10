import { describe, expect, it } from "vitest";
import { directoryToSiteReel, featurePatch, mergeShowcase, showcaseEligible, type FeaturedDirRow } from "@/lib/site/featured-reels";
import type { SiteReel } from "@/lib/site/reels";

const base = { isAdmin: true, featured: true, status: "live", maxOrder: 40, adminId: "admin-1", now: "2026-10-10T00:00:00Z" };
const row = { in_showcase: true, status: "live", video_url: "media:ws/directory/a.mp4", brand_id: "b1" };

describe("Showcase featuring", () => {
  it("featuring requires a live reel", () => {
    for (const status of ["in_review", "hidden", "private"]) expect(() => featurePatch({ ...base, status })).toThrow();
    expect(featurePatch(base)).toEqual({ in_showcase: true, showcase_order: 50, showcase_at: base.now, showcase_by: "admin-1" });
  });
  it("non-admins cannot feature or unfeature", () => {
    expect(() => featurePatch({ ...base, isAdmin: false })).toThrow("Not found");
    expect(() => featurePatch({ ...base, isAdmin: false, featured: false })).toThrow("Not found");
  });
  it("unfeaturing clears all four fields", () => {
    expect(featurePatch({ ...base, featured: false, status: "hidden" })).toEqual({ in_showcase: false, showcase_order: null, showcase_at: null, showcase_by: null });
  });
  it("a hidden reel drops off the list", () => {
    expect(showcaseEligible(row, new Set(["b1"]))).toBe(true);
    expect(showcaseEligible({ ...row, status: "hidden" }, new Set(["b1"]))).toBe(false);
  });
  it("a brand past its grace period drops off the list", () => {
    expect(showcaseEligible(row, new Set())).toBe(false);
  });
  it("a reel without video is skipped", () => {
    expect(showcaseEligible({ ...row, video_url: null }, new Set(["b1"]))).toBe(false);
  });
  it("maps a directory reel with source client and format 1x1 -> 11", () => {
    const r: FeaturedDirRow = { id: "r1", title: "T", display_title: null, description: null, formats: ["1x1"], created_at: "x", showcase_order: 50, brand: { id: "b1", name: "B", slug: "b", category: "home", website_url: null }, video: "v", poster: null, seconds: 6, photos: 3 };
    expect(directoryToSiteReel(r)).toMatchObject({ source: "client", format: "11", title: "T", videoWebm: null });
    expect(directoryToSiteReel({ ...r, video: null })).toBeNull();
  });
  it("merges by order then created date", () => {
    const s = (id: string) => ({ id } as SiteReel);
    const out = mergeShowcase(
      [{ reel: s("a"), order: 10, created: "2026-01-02" }, { reel: s("b"), order: 40, created: "2026-01-01" }],
      [{ reel: s("c"), order: 50, created: "2026-01-01" }, { reel: s("d"), order: 10, created: "2026-01-01" }],
    );
    expect(out.map((r) => r.id)).toEqual(["d", "a", "b", "c"]);
  });
});
