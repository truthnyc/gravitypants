import { describe, expect, it } from "vitest";
import { parseSearch } from "./parse-search";
const catalog = { moods: ["cozy", "calm", "warm", "luxurious", "moody", "vibrant", "bold"], brands: [{ name: "Agnona", slug: "agnona" }] };
describe("parseSearch", () => {
  it("reads a host occasion as three categories", () => {
    const r = parseSearch("something cozy for a host", catalog);
    expect(r.mood).toBe("cozy");
    expect(r.categories).toEqual(["wine-spirits", "food-drink", "home-living"]);
    expect(r.occasion).toBe("A host");
  });
  it("maps synonyms", () => expect(parseSearch("cosy", catalog).mood).toBe("cozy"));
  it("finds a brand", () => expect(parseSearch("Agnona", catalog).brand).toBe("agnona"));
  it("finds nothing in xyz", () => { const r = parseSearch("xyz", catalog); expect([r.mood, r.brand, r.categories.length]).toEqual([null, null, 0]); });
});
