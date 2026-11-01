import { describe, expect, it } from "vitest";
import { normalizeShop, signState, verifyState, verifyOAuthHmac } from "@/lib/shopify/shopify.server";
import { mediaKind } from "@/lib/shopify/product-media.server";

const SECRET = "test-secret";
async function hmac(msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("website store connection", () => {
  it("accepts the usual ways people type their store", () => {
    expect(normalizeShop("mystore")).toBe("mystore.myshopify.com");
    expect(normalizeShop("https://MyStore.myshopify.com/admin")).toBe("mystore.myshopify.com");
    expect(normalizeShop("admin.shopify.com/store/mystore")).toBe("mystore.myshopify.com");
    expect(normalizeShop("evil.com")).toBeNull();
  });
  it("rejects a tampered or expired state", async () => {
    const st = { ws: "w", uid: "u", shop: "a.myshopify.com", exp: Date.now() + 60_000 };
    const tok = await signState(st, SECRET);
    expect(await verifyState(tok, SECRET)).toEqual(st);
    expect(await verifyState(tok.replace(/^./, "x"), SECRET)).toBeNull();
    expect(await verifyState(tok, SECRET, st.exp + 1)).toBeNull();
  });
  it("checks Shopify's callback signature", async () => {
    const p = new URLSearchParams({ code: "c", shop: "a.myshopify.com", state: "s", timestamp: "1" });
    p.set("hmac", await hmac("code=c&shop=a.myshopify.com&state=s&timestamp=1"));
    expect(await verifyOAuthHmac(p, SECRET)).toBe(true);
    p.set("shop", "b.myshopify.com");
    expect(await verifyOAuthHmac(p, SECRET)).toBe(false);
  });
  it("sends GIFs as product images and MP4s as product videos", () => {
    expect(mediaKind("a.gif")).toBe("IMAGE");
    expect(mediaKind("a.mp4")).toBe("VIDEO");
    expect(mediaKind("a.zip")).toBeNull();
  });
});
