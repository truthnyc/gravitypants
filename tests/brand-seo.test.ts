import { describe, it, expect } from "vitest";
import { brandSeo, uniqueProducts } from "@/lib/directory/brand-seo";
describe("brandSeo", () => {
  it("puts brand and products in the title", () => {
    expect(brandSeo("Sail Racing", ["Cloud Down Hood", "Transarctic Jacket"]).title).toBe("Sail Racing: Cloud Down Hood, Transarctic Jacket | Aimanté");
  });
  it("keeps description within 158 characters", () => {
    expect(brandSeo("X", ["A"], "word ".repeat(80)).description.length).toBeLessThanOrEqual(158);
  });
  it("dedupes product names", () => { expect(uniqueProducts(["A", "a", null, "B"])).toEqual(["A", "B"]); });
});
