import { describe, expect, it } from "vitest";
import { ADMIN_ONLY_CATEGORIES, categoryOptions, DEFAULT_BRAND_CATEGORY, isPublicCategory, PUBLIC_CATEGORIES } from "@/lib/directory/directory";

describe("brand category dropdown", () => {
  it("defaults a brand that never picked a category to a visitor-visible one", () => {
    expect(isPublicCategory(DEFAULT_BRAND_CATEGORY)).toBe(true);
    expect(DEFAULT_BRAND_CATEGORY).toBe(PUBLIC_CATEGORIES[0]);
  });

  it("lists only public categories for a brand already in a public category", () => {
    expect(categoryOptions("Fashion")).toEqual(PUBLIC_CATEGORIES);
  });

  it("prepends a staff-only category so the select shows the saved value", () => {
    for (const adminOnly of ADMIN_ONLY_CATEGORIES) {
      const options = categoryOptions(adminOnly);
      expect(options[0]).toBe(adminOnly);
      expect(options.slice(1)).toEqual(PUBLIC_CATEGORIES);
    }
  });
});
