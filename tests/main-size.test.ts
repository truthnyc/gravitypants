import { describe, expect, it } from "vitest";
import { MAIN_SIZES, refitForMainSize, sizeLabel } from "@/lib/stillframe/main-size";
import type { EditorDoc } from "@/lib/stillframe/data";

const doc = {
  project: { id: "p", primary_format: "4:5", formats: ["4:5"], logo: { positions: { "16:9": "top-left" } } },
  frames: [{ id: "f", headline: { text: "Hi", position: "weird" }, subline: { text: "s", position: "bottom-left" }, photo: {}, format_overrides: {} }],
} as unknown as EditorDoc;

describe("main size", () => {
  it("has the five sizes and names", () => {
    expect(MAIN_SIZES.map((s) => sizeLabel(s.format))).toEqual(["Vertical 9:16", "Portrait 4:5", "Square 1:1", "Landscape 16:9", "Wide 5:4"]);
  });
  it("re-fits: main size set, export sizes include it, logo to kit default, text kept and snapped, crop centred", () => {
    const next = refitForMainSize(doc, "16:9", { "16:9": "bottom-right" });
    expect(next.project.primary_format).toBe("16:9");
    expect(next.project.formats).toEqual(["4:5", "16:9"]);
    expect(next.project.logo.positions?.["16:9"]).toBe("bottom-right");
    expect(next.frames[0]!.headline).toEqual({ text: "Hi", position: "center" });
    expect(next.frames[0]!.subline?.position).toBe("bottom-left");
    expect(next.frames[0]!.format_overrides?.["16:9"]?.photo?.focus).toEqual({ x: 0.5, y: 0.5 });
  });
});
