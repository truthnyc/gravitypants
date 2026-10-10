import { describe, expect, it } from "vitest";
import { frameForFormat, projectForFormat, patchPhotoForFormat, patchTextForFormat, patchLogoForFormat, patchFrameVisual, REEL_FORMATS } from "../src/lib/stillframe/format-settings";
import type { Frame, Project } from "../src/lib/stillframe/types";
import { layoutFrame, mediaPaths, videoDuration } from "../src/render/renderFrame";

const frame: Frame = {
  id: "f", project_id: "p", sort_order: 0, duration_sec: 2.5,
  photo: { path: "original.jpg", fit: "fill", zoom: 1, movement: "none" },
  headline: { text: "Original", size_px: 108, animation: "rise", position: "center" },
  subline: { text: "Subline", size_px: 48, animation: "fade" },
  transition_in: { type: "fade", speed: "smooth" }, logo_visible: true,
};
const project: Project = { id: "p", workspace_id: "w", name: "Test", primary_format: "9:16", formats: REEL_FORMATS,
  pace: "standard", logo: { path: "logo.png", size_pct: 16, show_on: "selected" }, end_card: {}, is_template: false,
  deleted_at: null, thumbnail_url: null, created_at: "", updated_at: "" };

describe("size-specific editor settings", () => {
  it("keeps photo replacement, crop and brightness independent", () => {
    const next = patchPhotoForFormat(frame, "4:5", { path: "portrait.jpg", fit: "fit", zoom: 1.8, brightness: 0.2 });
    expect(frameForFormat(next, "4:5").photo).toMatchObject({ path: "portrait.jpg", fit: "fit", zoom: 1.8, brightness: 0.2 });
    for (const format of ["9:16", "1:1", "16:9"] as const) expect(frameForFormat(next, format).photo).toEqual(frame.photo);
  });
  for (const el of ["headline", "subline"] as const) it(`keeps ${el} words, font, size and position independent`, () => {
    const next = patchTextForFormat(frame, "1:1", el, { text: "Square words", font_family: "Arial", size_px: 72, letter_spacing: 12, line_height: 1.4, position: "top-left" });
    expect(frameForFormat(next, "1:1")[el]).toMatchObject({ text: "Square words", font_family: "Arial", size_px: 72, letter_spacing: 12, line_height: 1.4, position: "top-left" });
    expect(frameForFormat(next, "9:16")[el]).toEqual(frame[el]);
  });
  it("keeps headline and subline specifications independent across all four sizes", () => {
    const adjusted = REEL_FORMATS.reduce((next, format, index) => {
      const withHeadline = patchTextForFormat(next, format, "headline", {
        size_px: 80 + index * 10,
        letter_spacing: index,
        line_height: 1 + index / 10,
      });
      return patchTextForFormat(withHeadline, format, "subline", {
        size_px: 36 + index * 6,
        letter_spacing: 10 + index,
        line_height: 1.2 + index / 10,
      });
    }, frame);

    REEL_FORMATS.forEach((format, index) => {
      expect(frameForFormat(adjusted, format).headline).toMatchObject({
        size_px: 80 + index * 10,
        letter_spacing: index,
        line_height: 1 + index / 10,
      });
      expect(frameForFormat(adjusted, format).subline).toMatchObject({
        size_px: 36 + index * 6,
        letter_spacing: 10 + index,
        line_height: 1.2 + index / 10,
      });
    });
  });
  it("keeps logo size independent across all four sizes", () => {
    const adjusted = REEL_FORMATS.reduce(
      (next, format, index) => patchLogoForFormat(next, format, { size_pct: 10 + index * 5 }),
      project,
    );
    REEL_FORMATS.forEach((format, index) => {
      expect(projectForFormat(adjusted, format).logo.size_pct).toBe(10 + index * 5);
    });
  });
  it("keeps logo artwork, size, opacity, scope and frame visibility independent", () => {
    const next = patchLogoForFormat(project, "16:9", { path: "wide.png", size_pct: 30, opacity: "soft", show_on: "first_last" });
    const f = patchFrameVisual(frame, "16:9", { logo_visible: false, logo_variant: "dark" });
    expect(projectForFormat(next, "16:9").logo).toMatchObject({ path: "wide.png", size_pct: 30, opacity: "soft", show_on: "first_last" });
    expect(projectForFormat(next, "9:16").logo).toEqual(project.logo);
    expect(frameForFormat(f, "16:9")).toMatchObject({ logo_visible: false, logo_variant: "dark" });
    expect(frameForFormat(f, "9:16").logo_visible).toBe(true);
  });
  it("shares movement, amount and custom movement across all sizes", () => {
    const next = patchPhotoForFormat(frame, "4:5", { movement: "pan_up", movement_intensity: "dramatic", zoom_start: 1.1, zoom_end: 1.4, pan_x: 0.3, pan_y: 0.7 });
    for (const format of REEL_FORMATS) expect(frameForFormat(next, format).photo).toMatchObject({ movement: "pan_up", movement_intensity: "dramatic", zoom_start: 1.1, zoom_end: 1.4, pan_x: 0.3, pan_y: 0.7 });
  });
  it("shares animation without changing other sizes' visuals", () => {
    const next = patchTextForFormat(patchTextForFormat(frame, "4:5", "headline", { size_px: 72 }), "16:9", "headline", { animation: "typewriter" });
    for (const format of REEL_FORMATS) expect(frameForFormat(next, format).headline?.animation).toBe("typewriter");
    expect(frameForFormat(next, "4:5").headline?.size_px).toBe(72);
    expect(frameForFormat(next, "16:9").headline?.size_px).toBe(108);
  });
  it("shares times and transitions and preserves settings on reload", () => {
    const adjusted = patchPhotoForFormat(frame, "4:5", { zoom: 2 });
    const restored: Frame = JSON.parse(JSON.stringify({ ...adjusted, duration_sec: 4, transition_in: { type: "wipe", speed: "quick" } }));
    for (const format of REEL_FORMATS) {
      expect(frameForFormat(restored, format).duration_sec).toBe(4);
      expect(frameForFormat(restored, format).transition_in).toEqual({ type: "wipe", speed: "quick" });
      expect(videoDuration(project, [frameForFormat(restored, format)])).toBe(4);
    }
    expect(frameForFormat(restored, "4:5").photo.zoom).toBe(2);
  });
  it("uses overrides in shared preview/export layout", () => {
    const next = patchTextForFormat(
      patchTextForFormat(frame, "1:1", "headline", { size_px: 72 }),
      "1:1",
      "subline",
      { size_px: 60, letter_spacing: 20, line_height: 1.5 },
    );
    const sizedProject = patchLogoForFormat(project, "1:1", { size_pct: 25 });
    const ctx = { measureText: (text: string) => ({ width: text.length * 10 }) } as unknown as CanvasRenderingContext2D;
    const square = layoutFrame(ctx, sizedProject, [next], 0, "1:1", 1080, 1080);
    const vertical = layoutFrame(ctx, sizedProject, [next], 0, "9:16", 1080, 1920);
    expect(square.headline?.fontPx).toBe(72);
    expect(square.subline).toMatchObject({ fontPx: 60, lineH: 90, spacingPx: 12 });
    expect(square.logo?.w).toBe(270);
    expect(vertical.headline?.fontPx).toBe(108);
    expect(vertical.subline).toMatchObject({ fontPx: 48, lineH: 60, spacingPx: 0 });
    expect(vertical.logo?.w).toBeCloseTo(172.8);
  });
  it("loads media from every size", () => {
    const f = patchPhotoForFormat(patchTextForFormat(frame, "1:1", "subline", { mode: "image", image_path: "badge.png" }), "4:5", { path: "portrait.jpg" });
    const p = patchLogoForFormat(project, "16:9", { path: "wide.png" });
    expect(mediaPaths(p, [f])).toEqual(expect.arrayContaining(["original.jpg", "portrait.jpg", "badge.png", "logo.png", "wide.png"]));
  });
});