import { describe, expect, it } from "vitest";
import { movementLabel } from "@/lib/stillframe/movement-label";

describe("movementLabel", () => {
  it("describes a custom zoom and pan", () => {
    expect(movementLabel({ movement: "custom", zoom_start: 1, zoom_end: 1.3, pan_x: 0.5, pan_y: -0.4 })).toEqual({ custom: true, text: "Custom: zoom 100% to 130%, moves right and up" });
  });
  it("marks presets as not custom", () => {
    expect(movementLabel({ movement: "pan_left", movement_intensity: "dramatic" })).toEqual({ custom: false, text: "Pans left (dramatic)" });
  });
  it("falls back to no movement", () => {
    expect(movementLabel({}).text).toBe("No movement");
  });
});
