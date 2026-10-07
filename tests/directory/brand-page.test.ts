import { describe, expect, it } from "vitest";
import { relatedBrandReason, showBrandConceptNotice } from "../../src/lib/directory/brand-page";

describe("Aimanté brand page rules", () => {
  it("shows the notice only for non-affiliated brands", () => {
    expect(showBrandConceptNotice(false)).toBe(true);
    expect(showBrandConceptNotice(true)).toBe(false);
    expect(showBrandConceptNotice(undefined)).toBe(false);
  });
  it("includes brands sharing a mood across categories", () => {
    expect(relatedBrandReason({ category: "Fashion", moods: ["cozy"] }, { category: "Home", moods: ["cozy"] })).toBe("cozy");
  });
  it("includes shared categories but excludes unrelated brands", () => {
    expect(relatedBrandReason({ category: "Fashion", moods: [] }, { category: "Fashion", moods: [] })).toBe("Fashion");
    expect(relatedBrandReason({ category: "Fashion", moods: [] }, { category: "Home", moods: [] })).toBeNull();
  });
});