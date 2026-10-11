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

import { addSlides, buildReel, changeSize, moveSlide, removeSlide, LIMIT_MESSAGE, type ReelItem } from "@/lib/shopify/reel-build";
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
    expect(r.frames[0]!.subline).toBeNull();
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
