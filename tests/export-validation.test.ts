import { describe, expect, it } from "vitest";
import { hasExportableBackground } from "@/lib/stillframe/export-validation";

describe("export frame backgrounds", () => {
  it("accepts a colour-only frame without a photo", () => {
    expect(hasExportableBackground({ path: null, background: "solid", background_color: "#0071E3" })).toBe(true);
  });
  it("accepts a solid background using the renderer's default colour", () => {
    expect(hasExportableBackground({ path: null, background: "solid" })).toBe(true);
  });
  it("accepts a gradient-only frame", () => {
    expect(hasExportableBackground({ path: null, background: "gradient", background_gradient: ["#0071E3", "#FFFFFF"] })).toBe(true);
  });
  it("still rejects a missing photo without an intentional background", () => {
    expect(hasExportableBackground({ path: null, background: "blur" })).toBe(false);
    expect(hasExportableBackground({ path: null })).toBe(false);
    expect(hasExportableBackground(undefined)).toBe(false);
  });
  it("accepts an ordinary photo frame", () => {
    expect(hasExportableBackground({ path: "workspace/photo.jpg", background: "blur" })).toBe(true);
  });
  it("rejects an unconfigured gradient without a photo", () => {
    expect(hasExportableBackground({ path: null, background: "gradient" })).toBe(false);
  });
});