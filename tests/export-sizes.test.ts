import { describe, expect, it } from "vitest";
import { DEFAULT_SIZES, customError, migrateSizes, platformState, ratioLabel, togglePlatform, type SizeId } from "@/lib/stillframe/export-sizes";

describe("export sizes", () => {
  it("starts with Portrait 4:5 only", () => {
    expect(DEFAULT_SIZES).toEqual(["4x5"]);
  });
  it.each([
    ["tiktok", ["9x16"]],
    ["youtube", ["16x9", "9x16"]],
    ["facebook", ["4x5", "9x16"]],
    ["linkedin", ["16x9", "4x5"]],
    ["website", ["16x9", "5x4"]],
  ] as const)("%s toggles exactly its required sizes", (platform, sizes) => {
    const selected = togglePlatform(platform, new Set());
    expect([...selected].sort()).toEqual([...sizes].sort());
    expect(platformState(platform, selected)).toBe("on");
    expect([...togglePlatform(platform, selected)]).toEqual([]);
    expect(platformState(platform, new Set([sizes[0]]))).toBe(sizes.length > 1 ? "mixed" : "on");
  });
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

import { EXPORT_SIZES } from "@/lib/stillframe/export-sizes";
describe("5x4 size", () => {
  it("is landscape 1350 × 1080", () => {
    const s = EXPORT_SIZES.find((x) => x.id === "5x4");
    expect([s?.width, s?.height, s?.layout]).toEqual([1350, 1080, "5:4"]);
  });
});
