import { describe, expect, it } from "vitest";
import { gradientPresets } from "@/lib/stillframe/palette";

describe("background gradient presets", () => {
  it("offers six distinct two-stop presets from photo and brand colours", () => {
    const p = gradientPresets(["#111111", "#444444", "#888888", "#BBBBBB", "#EEEEEE"], ["#0071E3", "#FF9500"]);
    expect(p).toHaveLength(6);
    expect(new Set(p.map((g) => g.join())).size).toBe(6);
    expect(p).toContainEqual(["#0071E3", "#FF9500"]);
  });
  it("still offers six presets with no photo or brand colours", () => {
    expect(gradientPresets([], [])).toHaveLength(6);
  });
});
