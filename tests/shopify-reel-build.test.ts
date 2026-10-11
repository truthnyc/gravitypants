import { describe, expect, it } from "vitest";
import { formatPrice, pickPhotos, MAX_PRODUCTS, MAX_FRAMES, type PickedProduct } from "@/lib/shopify/reel-build";

const prod = (id: string, n: number): PickedProduct => ({
  id, title: id, price: { amount: "10.00", currencyCode: "USD" },
  images: Array.from({ length: n }, (_, i) => ({ url: `https://cdn.shopify.com/${id}/${i}.jpg`, alt: null })),
});

describe("shopify reel rules", () => {
  it("uses at most 10 products", () => {
    const many = Array.from({ length: 15 }, (_, i) => prod(`p${i}`, 1));
    expect(new Set(pickPhotos(many).map((p) => p.product.id)).size).toBe(MAX_PRODUCTS);
  });
  it("caps the reel at 10 photos", () => {
    expect(pickPhotos([prod("a", 10), prod("b", 10)]).length).toBe(MAX_FRAMES);
  });
  it("keeps picked product order and gives each product a photo", () => {
    const out = pickPhotos([prod("a", 10), prod("b", 10)]).map((p) => p.product.id);
    expect(out.slice(0, 5)).toEqual(["a", "a", "a", "a", "a"]);
    expect(out[5]).toBe("b");
  });
  it("skips products without photos", () => {
    expect(pickPhotos([prod("a", 0), prod("b", 1)]).map((p) => p.product.id)).toEqual(["b"]);
  });
  it("formats the price", () => {
    expect(formatPrice({ amount: "25.0", currencyCode: "USD" })).toBe("$25");
    expect(formatPrice({ amount: "19.99", currencyCode: "USD" })).toBe("$19.99");
  });
});

import { addSlides, appendReelSlides, applyReelStyle, buildReel, changeSize, moveSlide, removeSlide, resetReelStyle, withLogoImage, LIMIT_MESSAGE, type ReelItem } from "@/lib/shopify/reel-build";
import { frameForFormat } from "@/lib/stillframe/format-settings";
import type { Template } from "@/lib/stillframe/data";

const tpl = { id: "t1", name: "Product Launch", source: "system", is_reusable: true, settings: { frames: [], formats: ["9:16"], primary_format: "9:16", pace: "standard", logo: {}, end_card: {} } } as unknown as Template;
const items = (n: number): ReelItem[] => Array.from({ length: n }, (_, i) => ({ path: `ws/p${i}.jpg`, headline: `H${i}`, subline: i % 2 ? "$5" : null }));
const opts = { shopName: "Shop", workspaceId: "ws", name: "Reel" };

describe("shopify reel screen rules", () => {
  it("sign-off slide is off by default", () => {
    expect(buildReel(tpl, items(2), opts).end_card.enabled).toBe(false);
  });
  it("price 0 or missing hides the subline", () => {
    expect(formatPrice({ amount: "0.0", currencyCode: "USD" })).toBeNull();
    expect(formatPrice(null)).toBeNull();
    const r = buildReel(tpl, [{ path: "ws/a.jpg", headline: "A", subline: formatPrice({ amount: "0", currencyCode: "USD" }) }], opts);
    expect(r.frames[0]?.subline).toBeNull();
  });
  it("add respects MAX_SLIDES", () => {
    expect(addSlides(items(MAX_FRAMES), items(1)).error).toBe(LIMIT_MESSAGE);
    expect(addSlides(items(MAX_FRAMES - 1), items(1)).items.length).toBe(MAX_FRAMES);
  });
  it("remove and reorder keep slides consistent", () => {
    expect(removeSlide(items(3), 1).items.map((i) => i.headline)).toEqual(["H0", "H2"]);
    expect(removeSlide(items(1), 0).error).not.toBeNull();
    expect(moveSlide(items(3), 0, 2).items.map((i) => i.headline)).toEqual(["H1", "H2", "H0"]);
  });
  it("format change keeps slides and words", () => {
    const r = changeSize(buildReel(tpl, items(4), opts), "4:5");
    expect(r.primary_format).toBe("4:5");
    expect(r.frames.map((f) => f.headline?.text)).toEqual(["H0", "H1", "H2", "H3"]);
  });
});

const launch = { ...tpl, settings: { ...tpl.settings, logo: { positions: { "9:16": "bottom-center" }, size_pct: 64, show_on: "all", opacity: "solid" } }, style: { logo_position: "bottom-center" } } as Template;
describe("Shopify styling persistence", () => {
  it("keeps Product Launch logo settings through build, upload and size changes", () => {
    const built = buildReel(launch, items(3), { ...opts, logoPath: "brand-assets:ws/auto.svg" });
    const uploaded = withLogoImage(built, "brand-assets:ws/manual.svg");
    const resized = changeSize(uploaded, "16:9");
    for (const reel of [built, uploaded, resized]) {
      expect(reel.logo.positions).toEqual({ "9:16": "bottom-center", "4:5": "bottom-center", "1:1": "bottom-center", "16:9": "bottom-center", "5:4": "bottom-center" });
      expect(reel.logo.size_pct).toBe(64);
      expect(reel.logo.show_on).toBe("all");
      expect(reel.logo.opacity).toBe("solid");
    }
    expect(resized.logo.path).toBe("brand-assets:ws/manual.svg");
  });
  it("applies text style to all slides without changing their words", () => {
    const r = applyReelStyle(buildReel(launch, items(3), opts), { element: "headline", scope: "all", index: 1, patch: { size_px: 132 } });
    expect(r.frames.map((f) => frameForFormat(f, "9:16").headline?.size_px)).toEqual([132, 132, 132]);
    expect(r.frames.map((f) => f.headline?.text)).toEqual(["H0", "H1", "H2"]);
  });
  it("applies text style only to the selected slide", () => {
    const base = buildReel(launch, items(3), opts);
    const r = applyReelStyle(base, { element: "headline", scope: "slide", index: 1, patch: { size_px: 132 } });
    expect(frameForFormat(r.frames[1] ?? base.frames[0], "9:16").headline?.size_px).toBe(132);
    expect(r.frames[0]).toEqual(base.frames[0]);
    expect(r.frames[2]).toEqual(base.frames[2]);
  });
  it("reordering and removing retain each photo's per-slide styling", () => {
    const base = applyReelStyle(buildReel(launch, items(3), opts), { element: "headline", scope: "slide", index: 0, patch: { size_px: 155, color: "#0071E3" } });
    const moved = moveSlide(base.frames, 0, 2).items;
    expect(moved[2]).toEqual(base.frames[0]);
    expect(moved.map((f) => f.photo.path)).toEqual(["ws/p1.jpg", "ws/p2.jpg", "ws/p0.jpg"]);
    expect(removeSlide(moved, 1).items[1]).toEqual(base.frames[0]);
  });
  it("new slides inherit current reel-wide style and enforce the limit", () => {
    const base = applyReelStyle(buildReel(launch, items(3), opts), { element: "headline", scope: "all", index: 0, patch: { size_px: 155 } });
    const added = appendReelSlides(base, [{ path: "ws/new.jpg", headline: "New", subline: "$9" }]);
    expect(frameForFormat(added.reel.frames[3] ?? base.frames[0], "9:16").headline?.size_px).toBe(155);
    expect(added.reel.frames.slice(0, 3)).toEqual(base.frames);
    expect(appendReelSlides(base, items(8)).error).toBe(LIMIT_MESSAGE);
  });
  it("reset restores template styling and keeps words and photos", () => {
    const base = buildReel(launch, items(3), opts);
    const edited = applyReelStyle(applyReelStyle(base, { element: "headline", scope: "slide", index: 0, patch: { size_px: 155 } }), { element: "logo", patch: { size_pct: 20, positions: { "9:16": "top-right" } } });
    const reset = resetReelStyle(edited, launch);
    expect(reset.logo.size_pct).toBe(64);
    expect(reset.logo.positions?.["9:16"]).toBe("bottom-center");
    expect(reset.frames.map((f) => f.photo)).toEqual(base.frames.map((f) => f.photo));
    expect(reset.frames.map((f) => f.headline)).toEqual(base.frames.map((f) => f.headline));
  });
});
