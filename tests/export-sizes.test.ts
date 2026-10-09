import { describe, expect, it } from "vitest";
import { customError, migrateSizes, platformState, ratioLabel, togglePlatform, type SizeId } from "@/lib/stillframe/export-sizes";

describe("export sizes", () => {
  it("Instagram selects Vertical + Portrait, then deselects both", () => {
    const on = togglePlatform("instagram", new Set());
    expect([...on].sort()).toEqual(["4x5", "9x16"]);
    expect(platformState("instagram", on)).toBe("on");
    expect([...togglePlatform("instagram", on)]).toEqual([]);
  });
  it("pill is mixed when only one of its sizes is picked", () => {
    expect(platformState("instagram", new Set<SizeId>(["9x16"]))).toBe("mixed");
  });
  it("migrates old platform picks to unique sizes", () => {
    expect(migrateSizes(["ig-reels", "tiktok", "yt-shorts", "ig-feed", "linkedin", "youtube", "web"])).toEqual(["9x16", "1x1", "16x9"]);
  });
  it("custom sizes must be 100–4096 px", () => {
    expect(customError(300, 250)).toBeNull();
    expect(customError(99, 250)).not.toBeNull();
    expect(customError(300, 4097)).not.toBeNull();
  });
  it("labels ratios", () => {
    expect(ratioLabel(300, 250)).toBe("6:5");
    expect(ratioLabel(1200, 628)).toBe("1.91:1");
  });
});
