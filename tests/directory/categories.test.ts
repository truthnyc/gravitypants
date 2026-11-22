import { describe, expect, it } from "vitest";
import { ADMIN_ONLY_CATEGORIES, CATEGORIES, PUBLIC_CATEGORIES, categoryFromSlug, legacyCategorySlug, normalizeCategory } from "@/lib/directory/directory";
import { canonicalDirectorySearch } from "@/lib/directory/legacy-urls";

describe("category restructure", () => {
  it("lists the 14 visitor categories in the agreed order", () => {
    expect(PUBLIC_CATEGORIES).toEqual(["Fashion", "Sports & Outdoor", "Jewelry & Watches", "Beauty & Fragrance", "Home & Living", "Crafts & Making", "Food & Drink", "Wellness", "Travel & Stays", "Kids & Family", "Pets", "Art & Photography", "Local Services", "Nonprofit & Events"]);
  });
  it("keeps Real Estate and Other for admins only", () => {
    expect(ADMIN_ONLY_CATEGORIES).toEqual(["Real Estate", "Other"]);
    expect(PUBLIC_CATEGORIES).not.toContain("Real Estate");
    expect(CATEGORIES).toContain("Other");
  });
  it("redirects every old category address to its new one", () => {
    expect(legacyCategorySlug("fashion-apparel")).toBe("fashion");
    expect(legacyCategorySlug("wine-spirits")).toBe("food-drink");
    expect(legacyCategorySlug("restaurants-cafes")).toBe("food-drink");
    expect(legacyCategorySlug("events-entertainment")).toBe("nonprofit-events");
    expect(legacyCategorySlug("nonprofit-causes")).toBe("nonprofit-events");
    expect(legacyCategorySlug("health-wellness")).toBe("wellness");
    expect(legacyCategorySlug("services-local-business")).toBe("local-services");
    expect(legacyCategorySlug("travel-hospitality")).toBe("travel-stays");
    expect(legacyCategorySlug("photography-visual-arts")).toBe("art-photography");
    expect(legacyCategorySlug("crafts-hobbies")).toBe("crafts-making");
    expect(legacyCategorySlug("fashion")).toBeNull();
  });
  it("maps old names when importing", () => {
    expect(normalizeCategory("Fashion & Apparel")).toBe("Fashion");
    expect(normalizeCategory("Arts, Crafts & Hobbies")).toBe("Crafts & Making");
    expect(categoryFromSlug("art-photography")).toBe("Art & Photography");
  });
  it("rewrites old mood and category links to current names", () => {
    expect(canonicalDirectorySearch({ mood: "serene" })).toEqual({ mood: "calm" });
    expect(canonicalDirectorySearch({ category: "fashion-apparel", mood: "calm" })).toEqual({ category: "fashion", mood: "calm" });
    expect(canonicalDirectorySearch({ category: "fashion", mood: "calm" })).toBeNull();
  });
});
