import { describe, expect, it } from "vitest";
import { EMBED_SIZES, embedCode, embedFormat, embedSize, embedUrl } from "@/lib/site/embed";

describe("reel embed code", () => {
  it("reads a reel's shape from either code style", () => {
    expect(embedFormat("9x16")).toBe("9:16"); // Directory stores it this way
    expect(embedFormat("916")).toBe("9:16"); // website reels store it this way
    expect(embedFormat("4x5")).toBe("4:5");
    expect(embedFormat("5x4")).toBe("5:4");
    expect(embedFormat("1x1")).toBe("1:1");
    expect(embedFormat("169")).toBe("16:9");
    expect(embedFormat("9:16")).toBe("9:16");
    // A reel with no recorded shape still opens at the tallest one rather than a broken box.
    expect(embedFormat(null)).toBe("9:16");
    expect(embedFormat("")).toBe("9:16");
  });

  it("keeps the reel's own shape at every size a client can pick", () => {
    for (const s of EMBED_SIZES) {
      const tall = embedSize("9:16", s.scale);
      expect(tall.h / tall.w).toBeCloseTo(640 / 360, 1);
      const wide = embedSize("16:9", s.scale);
      expect(wide.w / wide.h).toBeCloseTo(640 / 360, 1);
      const square = embedSize("1:1", s.scale);
      expect(square.w).toBe(square.h);
    }
    expect(embedSize("1:1", 1)).toEqual({ w: 500, h: 500 });
    expect(embedSize("4:5", 1)).toEqual({ w: 480, h: 600 });
    expect(embedSize("5:4", 1)).toEqual({ w: 540, h: 432 });
    expect(embedSize("9:16", 1.5)).toEqual({ w: 540, h: 960 });
  });

  it("points the frame at gravitypants.com and carries the chosen size", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const code = embedCode(id, embedSize("9:16", 1), "Grand Turk Pillow");
    expect(code).toContain(`src="${embedUrl(id)}"`);
    expect(embedUrl(id)).toBe("https://gravitypants.com/embed/reel/11111111-1111-1111-1111-111111111111");
    expect(code).toContain('width="360"');
    expect(code).toContain('height="640"');
    expect(code).toContain("allowfullscreen");
    // The frame must not carry a sign-in or a private file link.
    expect(code).not.toMatch(/token=/);
    expect(code).not.toMatch(/supabase/);
  });

  it("escapes a title so it cannot break the frame tag", () => {
    const code = embedCode("a", embedSize("1:1", 1), 'He said "hi" & <b>left</b>');
    expect(code).toContain("&quot;hi&quot;");
    expect(code).toContain("&amp;");
    expect(code).toContain("&lt;b&gt;");
    // Exactly one title attribute, and it closes.
    expect(code.match(/ title="[^"]*"/g)).toHaveLength(1);
  });
});
