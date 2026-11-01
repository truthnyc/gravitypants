import { describe, expect, it } from "vitest";
import { reelProductIds } from "@/lib/shopify/product-media.server";

describe("reelProductIds", () => {
  it("returns each Shopify product once, ignoring slides without products", () => {
    const a = "gid://shopify/Product/1";
    const b = "gid://shopify/Product/2";
    expect(reelProductIds([{ shopify_product_id: a }, null, { shopify_product_id: b }, { shopify_product_id: a }, { shopify_product_id: "bad" }])).toEqual([a, b]);
  });
});
