import { describe, expect, it } from "vitest";
import { subcategoriesFor, validSubcategory } from "@/lib/directory/subcategories";

describe("brand subcategories", () => {
  const knitwear = { id: "knitwear", name: "Knitwear", parent_id: "fashion", visibility: "public" };
  const wine = { id: "wine", name: "Wine & Spirits", parent_id: "food", visibility: "public" };
  it("Fashion offers Knitwear but not Food & Drink children", () => {
    expect(subcategoriesFor([knitwear, wine], "fashion").map((c) => c.name)).toEqual(["Knitwear"]);
  });
  it("rejects assignment under another parent", () => {
    expect(validSubcategory(wine, "fashion")).toBe(false);
    expect(validSubcategory(knitwear, "fashion")).toBe(true);
  });
  it("retired children cannot be assigned", () => {
    expect(validSubcategory({ ...knitwear, visibility: "retired" }, "fashion")).toBe(false);
  });
});