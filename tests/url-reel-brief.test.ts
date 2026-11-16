import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { productText } from "@/lib/directory/product-page";
import { bigEnough, imageSize, minimalBrief, parseBrief, photoKey, verifyFacts, MAX_PRODUCT_PHOTOS } from "@/lib/stillframe/url-reel";

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

describe("productText", () => {
  it("reads description, brand and list details without page chrome", () => {
    const t = productText(fx("product-rich.html"), "https://shop.test/p");
    expect(t.description).toBe("A hand-thrown stoneware mug made in Lisbon. Holds 350 ml.");
    expect(t.brand).toBe("Casa Barro");
    expect(t.details.split("\n")).toContain("Stoneware with a matte glaze");
    expect(t.details).not.toMatch(/Shop Menu|Copyright|var x|Email/);
  });
  it("falls back to the description meta tag on a thin page", () => {
    const t = productText(fx("product-thin.html"), "https://shop.test/p");
    expect(t.description).toBe("Basic tee");
    expect(t.brand).toBeNull();
  });
});

describe("brief checks", () => {
  const page = ["A hand-thrown stoneware mug made in Lisbon.", "Dishwasher safe"];
  it("drops a fact whose quote is not on the page", () => {
    const kept = verifyFacts([{ text: "Made in Lisbon", quote: "made in  LISBON" }, { text: "Award winner", quote: "won a design award" }], page);
    expect(kept.map((f) => f.text)).toEqual(["Made in Lisbon"]);
  });
  it("returns null on bad JSON so the caller uses the minimal brief", () => {
    expect(parseBrief("not json", page, 2)).toBeNull();
    expect(minimalBrief("Lisbon Mug", 2)).toEqual({ what_it_is: "Lisbon Mug", who_its_for: null, facts: [], difference: null, feeling: "", voice: null,
      photos: [{ index: 0, shows: "", role: "other", usable: true }, { index: 1, shows: "", role: "other", usable: true }] });
  });
  it("drops the difference when no fact survives", () => {
    const b = parseBrief(JSON.stringify({ what_it_is: "A mug", facts: [{ text: "x", quote: "invented" }], difference: "Best mug ever", feeling: "calm", photos: [] }), page, 1);
    expect(b?.facts).toEqual([]);
    expect(b?.difference).toBeNull();
  });
});

describe("photo rules", () => {
  it("allows six photos", () => expect(MAX_PRODUCT_PHOTOS).toBe(6));
  it("reads PNG size and rejects a short side under 600 px", () => {
    const png = new Uint8Array(32); png.set([0x89, 0x50, 0x4e, 0x47]);
    png.set([0, 0, 3, 0x20], 16); png.set([0, 0, 2, 0x57], 20); // 800 x 599
    expect(imageSize(png)).toEqual({ width: 800, height: 599 });
    expect(bigEnough(imageSize(png))).toBe(false);
    expect(bigEnough({ width: 800, height: 600 })).toBe(true);
  });
  it("reads JPEG size", () => {
    const j = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x04, 0xb0, 0x03, 0x20, 3, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(imageSize(j)).toEqual({ width: 800, height: 1200 });
  });
  it("treats size and query variants as the same photo", () => {
    expect(photoKey("https://cdn.test/a_800x.jpg?v=2")).toBe(photoKey("https://cdn.test/a.jpg"));
    expect(photoKey("https://cdn.test/a.jpg")).not.toBe(photoKey("https://cdn.test/b.jpg"));
  });
});
