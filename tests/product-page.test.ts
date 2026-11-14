import { describe, expect, it } from "vitest";
import { hasProductData, isPublicHost, parseProductPage } from "@/lib/directory/product-page";

const ld = (o: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(o)}</script></head></html>`;

describe("product page reader", () => {
  const variantGroup = { "@type": "ProductGroup", name: "Jacket", hasVariant: [
    { "@type": "Product", offers: { url: "https://shop.example.com/jacket?variant=53286360613200", price: 600, priceCurrency: "USD", availability: "https://schema.org/OutOfStock" } },
    { "@type": "Product", offers: { url: "https://shop.example.com/jacket?variant=53286360678736", price: 600, priceCurrency: "USD", availability: "https://schema.org/InStock" } },
  ] };
  it("reads available variant 53286360678736 rather than the first sold-out offer", () => {
    expect(parseProductPage(ld(variantGroup), "https://shop.example.com/jacket?variant=53286360678736").availability).toBe("in_stock");
  });
  it("keeps unavailable variant 53286360613200 sold out", () => {
    expect(parseProductPage(ld(variantGroup), "https://shop.example.com/jacket?variant=53286360613200").availability).toBe("out_of_stock");
  });
  it("keeps a product group visible when any variant is available", () => {
    expect(parseProductPage(ld(variantGroup), "https://shop.example.com/jacket").availability).toBe("in_stock");
  });
  it("does not guess stock for an unidentified variant", () => {
    expect(parseProductPage(ld(variantGroup), "https://shop.example.com/jacket?variant=missing").availability).toBe("unknown");
  });
  it("reads a Shopify-style Product with an offers array", () => {
    const p = parseProductPage(ld({ "@context": "https://schema.org", "@type": "Product", name: "Wool Throw", image: ["//cdn.shop.com/a.jpg"], offers: [{ "@type": "Offer", price: "120.00", priceCurrency: "usd", availability: "https://schema.org/InStock" }] }), "https://shop.example.com/products/throw");
    expect(p).toMatchObject({ name: "Wool Throw", price: 120, currency: "USD", image_url: "https://cdn.shop.com/a.jpg", availability: "in_stock" });
  });
  it("reads a WooCommerce-style @graph Product", () => {
    const p = parseProductPage(ld({ "@graph": [{ "@type": "WebPage" }, { "@type": "Product", name: "Mug", image: { url: "https://w.com/m.jpg" }, offers: [{ "@type": "Offer", price: "18", priceCurrency: "EUR", availability: "http://schema.org/OutOfStock" }] }] }), "https://w.com/p/mug");
    expect(p).toMatchObject({ name: "Mug", price: 18, currency: "EUR", image_url: "https://w.com/m.jpg", availability: "out_of_stock" });
  });
  it("uses lowPrice for an AggregateOffer", () => {
    expect(parseProductPage(ld({ "@type": "Product", name: "Ring", offers: { "@type": "AggregateOffer", lowPrice: 90, highPrice: 140, priceCurrency: "USD" } }), "https://r.com").price).toBe(90);
  });
  it("falls back to Open Graph tags", () => {
    const html = `<meta property="og:title" content="Linen Shirt &amp; Co"><meta property="og:image" content="https://s.com/i.jpg"><meta property="product:price:amount" content="65.00"><meta property="product:price:currency" content="GBP">`;
    expect(parseProductPage(html, "https://s.com/x")).toMatchObject({ name: "Linen Shirt & Co", price: 65, currency: "GBP", image_url: "https://s.com/i.jpg" });
  });
  it("reports no product data on a plain page", () => {
    expect(hasProductData(parseProductPage("<html><title>Hi</title></html>", "https://a.com"))).toBe(false);
  });
  it("refuses localhost and private addresses", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "[::1]", "fd00::1", "intranet", "2130706433"]) expect(isPublicHost(h)).toBe(false);
    expect(isPublicHost("shop.example.com")).toBe(true);
    expect(isPublicHost("8.8.8.8")).toBe(true);
  });
});
