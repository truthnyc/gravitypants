import { describe, expect, it } from "vitest";
import { medianCut, normalizeHex, photoName } from "../src/lib/stillframe/palette";

describe("photo tab colours", () => {
  it("accepts 3 or 6 digit hex with optional #", () => {
    expect(normalizeHex("abc")).toBe("#AABBCC");
    expect(normalizeHex("#1d1d1f")).toBe("#1D1D1F");
    expect(normalizeHex("12345")).toBeNull();
    expect(normalizeHex("#ggg")).toBeNull();
  });
  it("returns palette darkest first", () => {
    const px = [255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255, 250, 250, 250, 255];
    const out = medianCut(px, 3);
    expect(out[0]).toBe("#000000");
    expect(out.length).toBeLessThanOrEqual(3);
  });
  it("never shows a file hash as the photo name", () => {
    expect(photoName({ path: "ws/photos/3f2a9c1e-1111-2222-3333-444455556666-a8f9c0d1e2b3c4d5.jpg" }, 4)).toBe("Photo 5");
    expect(photoName({ path: "ws/photos/3f2a9c1e-1111-2222-3333-444455556666-Linen-throw.jpg" }, 0)).toBe("Linen-throw");
    expect(photoName({ name: "Spring scarf" }, 0)).toBe("Spring scarf");
  });
});
