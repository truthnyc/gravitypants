import { describe, expect, it } from "vitest";
import { changeFrameLength, clampFrameSeconds, matchingPace } from "../src/components/editor/frame-timing";
import { PACE_SECONDS, type Frame } from "../src/lib/stillframe/types";
const frames = [2.5, 3.5, 1.5].map((duration_sec, i) => ({ id: String(i), duration_sec }) as Frame);
describe("frame strip timing", () => {
  it("limits timing to 1–8 seconds", () => { expect(clampFrameSeconds(0.5)).toBe(1); expect(clampFrameSeconds(8.5)).toBe(8); });
  it("uses half-second steps", () => { expect(clampFrameSeconds(3.3)).toBe(3.5); expect(clampFrameSeconds(3.1)).toBe(3); });
  it("changes just the target when sharing is off", () => { expect(changeFrameLength(frames, 1, 4, false).map(f => f.duration_sec)).toEqual([2.5, 4, 1.5]); });
  it("changes every frame when sharing is on", () => { expect(changeFrameLength(frames, 1, 4, true).map(f => f.duration_sec)).toEqual([4, 4, 4]); });
  it("uses the requested pace lengths", () => { expect(PACE_SECONDS).toEqual({ relaxed: 3.5, standard: 2.5, fast: 1.5 }); });
  it("selects pace only when all frame lengths match", () => { expect(matchingPace(frames)).toBeUndefined(); expect(matchingPace(changeFrameLength(frames, 0, 3.5, true))).toBe("relaxed"); });
});