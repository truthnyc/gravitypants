import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_FORMATS, DEFAULT_VIDEO_FPS, DEFAULT_GIF_LOOP, DEFAULT_GIF_QUALITY, GIF_PRESETS, matchingGifPreset } from "@/lib/stillframe/export-quality";
describe("export quality rules", () => {
  it("starts with MP4 only at 30 fps", () => {
    expect(DEFAULT_EXPORT_FORMATS).toEqual({ mp4: true, gif: false });
    expect(DEFAULT_VIDEO_FPS).toBe(30);
  });
  it("defaults to balanced GIF quality and forever looping", () => {
    expect(DEFAULT_GIF_QUALITY).toEqual({ size: "half", colors: "balanced", fps: 15 });
    expect(DEFAULT_GIF_LOOP).toBe("forever");
  });
  it.each([
    ["small", "small", "smallest", 10],
    ["balanced", "half", "balanced", 15],
    ["best", "full", "best", 25],
  ] as const)("%s applies its exact size, colors and fps", (id, size, colors, fps) => {
    expect(GIF_PRESETS.find((p) => p.id === id)).toMatchObject({ size, colors, fps });
    expect(matchingGifPreset({ size, colors, fps })).toBe(id);
  });
  it("does not select a preset for custom advanced settings", () => {
    expect(matchingGifPreset({ size: "half", colors: "best", fps: 15 })).toBeNull();
    expect(matchingGifPreset({ size: "half", colors: "balanced", fps: 10 })).toBeNull();
    expect(matchingGifPreset({ size: "full", colors: "balanced", fps: 15 })).toBeNull();
  });
});
