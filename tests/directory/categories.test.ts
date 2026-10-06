import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryFromSlug, normalizeCategory } from "../../src/lib/directory/directory";
describe("Shared brand and reel categories", () => {
  it("preserves assignments under Crafts & Hobbies", () => {
    expect(normalizeCategory("Arts, Crafts & Hobbies")).toBe("Crafts & Hobbies");
    expect(normalizeCategory("arts,-crafts-&-hobbies")).toBe("Crafts & Hobbies");
    expect(CATEGORIES).toContain("Crafts & Hobbies");
    expect(CATEGORIES).not.toContain("Arts, Crafts & Hobbies");
  });
  it("adds Photography & Visual Arts and its page slug", () => {
    expect(CATEGORIES).toContain("Photography & Visual Arts");
    expect(categoryFromSlug("photography-visual-arts")).toBe("Photography & Visual Arts");
  });
  it("sorts A–Z with Other last", () => {
    expect(CATEGORIES.at(-1)).toBe("Other");
    const choices = CATEGORIES.slice(0, -1);
    expect(choices).toEqual([...choices].sort((a,b) => a.localeCompare(b, "en")));
  });
});
