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
