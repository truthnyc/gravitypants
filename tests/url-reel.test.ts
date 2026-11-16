import { describe, expect, it } from "vitest";
import { framePhotos, parseStories, pickDraftTemplates, priceLine } from "@/lib/stillframe/url-reel";
import { productImages } from "@/lib/directory/product-page";

const product = { name: "Sand Jacket", price: 120, currency: "USD", url: "https://x.com/p" };

describe("create from a product link", () => {
  it("offers three different templates that fit the chosen size", () => {
    const t = [
      { id: "a", name: "A", format: "9:16" }, { id: "b", name: "B", format: "1:1" },
      { id: "c", name: "C", format: null, featured: true }, { id: "d", name: "D", format: "9:16" }, { id: "e", name: "E", format: "9:16" },
    ];
    expect(pickDraftTemplates(t, "9:16").map((x) => x.id)).toEqual(["c", "a", "d"]);
  });
  it("always returns three drafts, filling unusable AI answers", () => {
    const good = { angle: "Bold", frames: [{ headline: "Built for wind" }, { headline: "Soft inside" }, { headline: "Shop now", subline: "$120" }] };
    const s = parseStories(JSON.stringify({ drafts: [good, { frames: [] }] }), product);
    expect(s).toHaveLength(3);
    expect(s[0]!.lines[0]![0]).toBe("Built for wind");
    expect(s[1]!.lines[2]![1]).toBe("$120");
  });
  it("repeats photos when the page has fewer than three", () => {
    expect(framePhotos(2)).toEqual([0, 1, 0]);
  });
  it("shows no price when the page has none", () => {
    expect(priceLine(null, "USD")).toBe("");
  });
  it("collects every product photo once", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"J","image":["https://s.com/a_800x.jpg?v=1","https://s.com/a.jpg","https://s.com/b.jpg"]}</script><meta property="og:image" content="https://s.com/c.jpg">`;
    expect(productImages(html, "https://s.com/p")).toEqual(["https://s.com/a_800x.jpg?v=1", "https://s.com/b.jpg", "https://s.com/c.jpg"]);
  });
});
