import { describe, expect, it } from "vitest";
import { isHttpsUrl, productHref } from "../src/lib/directory/products";

describe("reel products", () => {
  it("adds Aimanté tracking with the reel id as campaign", () => {
    const h = new URL(productHref("https://shop.example.com/p/1?color=red#top", "abc"));
    expect(h.searchParams.get("utm_source")).toBe("aimante");
    expect(h.searchParams.get("utm_medium")).toBe("directory");
    expect(h.searchParams.get("utm_campaign")).toBe("abc");
    expect(h.searchParams.get("color")).toBe("red");
    expect(h.hash).toBe("#top");
  });
  it("accepts only https links", () => {
    expect(isHttpsUrl("https://a.com/x")).toBe(true);
    expect(isHttpsUrl("http://a.com/x")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });
});
