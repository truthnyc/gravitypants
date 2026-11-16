import { describe, expect, it } from "vitest";
import { allowedShapes, checkDraft, fallbackDraft, matchTemplates, minimalBrief, parseDrafts, pickDraftTemplates, priceLine, type ProductBrief, type RawDraft } from "@/lib/stillframe/url-reel";
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
  it("still offers three drafts when no template is made for the size", () => {
    const t = [{ id: "a", name: "A", format: "9:16" }, { id: "b", name: "B", format: "1:1" }, { id: "x", name: "X", format: "1:1", status: "archived" }, { id: "c", name: "C", format: "16:9" }];
    expect(pickDraftTemplates(t, "4:5").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("shows no price when the page has none", () => {
    expect(priceLine(null, "USD")).toBe("");
  });
  it("collects every product photo once", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"J","image":["https://s.com/a_800x.jpg?v=1","https://s.com/a.jpg","https://s.com/b.jpg"]}</script><meta property="og:image" content="https://s.com/c.jpg">`;
    expect(productImages(html, "https://s.com/p")).toEqual(["https://s.com/a_800x.jpg?v=1", "https://s.com/b.jpg", "https://s.com/c.jpg"]);
  });
});

const brief: ProductBrief = {
  what_it_is: "A wool jacket", who_its_for: "Sailors", difference: null, feeling: "calm", voice: null,
  facts: [{ text: "Merino wool lining", quote: "x" }, { text: "Made in Portugal", quote: "y" }, { text: "Weighs 600 g", quote: "z" }],
  photos: [{ index: 0, shows: "jacket", role: "hero", usable: true }, { index: 1, shows: "lining", role: "detail", usable: true },
    { index: 2, shows: "on a boat", role: "in_use", usable: true }, { index: 3, shows: "size chart", role: "other", usable: false }],
};
const ok: RawDraft = { shape: "made", frames: [
  { role: "a", photo: 1, headline: "Merino wool inside", subline: "", fact: 0 },
  { role: "b", photo: 0, headline: "Cut and sewn in Portugal", subline: "", fact: 1 },
  { role: "c", photo: 2, headline: "Ready for the water", subline: "", fact: null },
  { role: "ask", photo: 0, headline: "Sand Jacket, shop now", subline: "$120", fact: null },
] };

describe("story shapes", () => {
  it("allows shapes only when the brief supports them", () => {
    expect(allowedShapes(brief)).toEqual(["why", "made", "moment", "detail", "simple"]);
    expect(allowedShapes(minimalBrief("Tee", 1))).toEqual(["simple"]);
  });
  it("passes a grounded draft", () => expect(checkDraft(ok, brief, "$120")).toEqual([]));
  it("rejects an unusable photo", () => {
    const d = { ...ok, frames: ok.frames.map((f, i) => (i === 2 ? { ...f, photo: 3 } : f)) };
    expect(checkDraft(d, brief, "$120")).toContain("uses a missing or unusable photo");
  });
  it("rejects fewer than two fact frames, except simple", () => {
    const d = { ...ok, frames: ok.frames.map((f) => ({ ...f, fact: null })) };
    expect(checkDraft(d, brief, "$120")).toContain("fewer than two frames carry a fact");
    expect(checkDraft({ ...d, shape: "simple" }, brief, "$120")).not.toContain("fewer than two frames carry a fact");
  });
  it("rejects long headlines, banned phrases, repeats and other prices", () => {
    const f = ok.frames;
    expect(checkDraft({ ...ok, frames: [{ ...f[0]!, headline: "one two three four five six seven eight nine ten" }, ...f.slice(1)] }, brief, "$120")).toContain("a headline is longer than 9 words");
    expect(checkDraft({ ...ok, frames: [{ ...f[0]!, subline: "A timeless piece" }, ...f.slice(1)] }, brief, "$120")).toContain('uses the empty phrase "timeless"');
    expect(checkDraft({ ...ok, frames: [f[0]!, { ...f[1]!, headline: f[0]!.headline }, ...f.slice(2)] }, brief, "$120")).toContain("two frames have the same headline");
    expect(checkDraft({ ...ok, frames: [...f.slice(0, 3), { ...f[3]!, subline: "Now $99" }] }, brief, "$120")).toContain("mentions a price or offer that wasn't given");
    expect(checkDraft({ ...ok, frames: [...f.slice(0, 3), { ...f[3]!, subline: "20% off" }] }, brief, "")).toContain("mentions a price or offer that wasn't given");
  });
  it("falls back to the first fact, and drops that frame when there is none", () => {
    const p = { name: "Sand Jacket", price: 120, currency: "USD", url: "u" };
    expect(fallbackDraft(p, brief).frames.map((x) => x.headline)).toEqual(["Sand Jacket", "Merino wool lining", "Shop now"]);
    expect(fallbackDraft(p, minimalBrief("Sand Jacket", 1)).frames.map((x) => x.headline)).toEqual(["Sand Jacket", "Shop now"]);
    expect(fallbackDraft(p, brief).frames.map((x) => x.headline).join(" ")).not.toMatch(/made to be noticed/i);
  });
  it("reads frames with their photo and fact", () => {
    const d = parseDrafts(JSON.stringify({ drafts: [ok] }));
    expect(d[0]!.frames[1]).toEqual(ok.frames[1]);
  });
  it("matches templates by slide count", () => {
    const t = [{ id: "two", name: "Two", slideCount: 2 }, { id: "four", name: "Four", slideCount: 4 }, { id: "three", name: "Three", slideCount: 3 }];
    expect(matchTemplates(t, [4, 3, 4]).map((x) => x.id)).toEqual(["four", "three", "two"]);
  });
});
