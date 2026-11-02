import { describe, expect, it } from "vitest";
import { clampOffset, clampScale, photoOffset, photoScale } from "@/lib/stillframe/framing";

describe("photo framing", () => {
  it("clamps scale to 50–200%", () => {
    expect(clampScale(30)).toBe(50);
    expect(clampScale(250)).toBe(200);
  });
  it("clamps offset to ±60%", () => {
    expect(clampOffset(80)).toBe(60);
    expect(clampOffset(-80)).toBe(-60);
  });
  it("migrates legacy zoom to scale", () => {
    expect(photoScale({ zoom: 1.2 })).toBe(120);
    expect(photoScale({})).toBe(100);
  });
  it("migrates legacy focus to the same drawn position", () => {
    // 2000x1000 photo in a 1000x1000 frame, focus at left edge -> photo shifted right by 50% of frame
    const o = photoOffset({ focus: { x: 0, y: 0.5 } }, { iw: 2000, ih: 1000, W: 1000, H: 1000 });
    expect(o.x).toBeCloseTo(50);
    expect(o.y).toBeCloseTo(0);
  });
});
