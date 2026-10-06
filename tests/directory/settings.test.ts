import { describe, expect, it } from "vitest";
import { DEFAULT_DIRECTORY_SETTINGS as D, SPEED_SECONDS, mondayOf, resolveFeatured } from "@/lib/directory/settings";

const pool = Array.from({ length: 30 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`, moods: i % 2 ? ["cozy"] : [], cat_slug: "food-drink", brand_slug: `b${i}` }));
const now = new Date("2026-10-07T12:00:00Z"); // a Wednesday

describe("directory settings", () => {
  it("defaults: 12 reels, 12 per page, auto-load 3, Featured this week", () => {
    expect(D.count).toBe(12); expect(D.pageSize).toBe(12); expect(D.autoLoadPages).toBe(3);
    expect(D.title).toBe("Featured this week"); expect(D.comingSoon).toBe(true);
  });
  it("speed is 9 / 6 / 4 seconds per reel", () => expect(SPEED_SECONDS).toEqual({ slow: 9, normal: 6, fast: 4 }));
  it("weeks start on Monday", () => expect(mondayOf(now)).toBe("2026-10-05"));
  it("automatic shows `count` reels", () => expect(resolveFeatured(D, [], pool, now)).toHaveLength(12));
  it("most viewed ranks actual weekly opens across website and Directory reels", () => {
    const reels = [
      { id: "new", kind: "site", moods: [], cat_slug: "food-drink", brand_slug: "a" },
      { id: "older", kind: "directory", moods: [], cat_slug: "food-drink", brand_slug: "b" },
      { id: "third", kind: "site", moods: [], cat_slug: "food-drink", brand_slug: "c" },
    ];
    const selected = resolveFeatured({ ...D, rule: "viewed" }, [], reels, now, {}, { "directory:older": 7, "site:third": 2 });
    expect(selected.map((r) => r.id)).toEqual(["older", "third", "new"]);
    expect(resolveFeatured({ ...D, rule: "viewed" }, [], reels, now).map((r) => r.id)).toEqual(["new", "older", "third"]);
  });
  it("weekly view ranking still respects automatic brand filters", () => {
    const reels = pool.map((r) => ({ ...r, kind: "site" }));
    const chosen = resolveFeatured({ ...D, rule: "viewed", ruleBrands: ["b2"] }, [], reels, now, {}, { [`site:${reels[0]?.id}`]: 99 });
    expect(chosen.map((r) => r.brand_slug)).toEqual(["b2"]);
  });
  it("hand-picked keeps the chosen order", () => {
    const picks = [pool[5]!, pool[2]!].map((r) => ({ reelId: r.id, kind: "site" as const, week: null }));
    expect(resolveFeatured({ ...D, source: "manual" }, picks, pool, now).map((r) => r.id)).toEqual([pool[5]!.id, pool[2]!.id]);
  });
  it("a week with no picks falls back to the automatic rule", () => {
    const picks = [{ reelId: pool[1]!.id, kind: "site" as const, week: "2026-10-12" }];
    expect(resolveFeatured({ ...D, rotateWeekly: true, ruleMoods: ["cozy"] }, picks, pool, now).every((r) => r.moods.includes("cozy"))).toBe(true);
  });
  it("hidden outside the show window or when turned off", () => {
    expect(resolveFeatured({ ...D, showFrom: "2026-11-01T00:00" }, [], pool, now)).toEqual([]);
    expect(resolveFeatured({ ...D, showCarousel: false }, [], pool, now)).toEqual([]);
  });
});
