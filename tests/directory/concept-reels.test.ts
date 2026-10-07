import { describe, expect, it } from "vitest";
import { isConceptBrand } from "../../src/lib/directory/concept-reels";

describe("User-identified non-participating brands", () => {
  it("identifies Agnona", () => {
    expect(isConceptBrand("Agnona")).toBe(true);
    expect(isConceptBrand(undefined, "agnona")).toBe(true);
  });
  it("identifies Maison Francis Kurkdjian and its existing Baccarat Rouge 540 label", () => {
    expect(isConceptBrand("MAison Francis Kurkdjian")).toBe(true);
    expect(isConceptBrand("Baccarat Rouge 540")).toBe(true);
    expect(isConceptBrand(undefined, "maison-francis-kurkdjian")).toBe(true);
  });
  it("does not classify other brands or unknown brands as non-participants", () => {
    expect(isConceptBrand("Purl Soho", "purl-soho")).toBe(false);
    expect(isConceptBrand("Agnona collaborator")).toBe(false);
    expect(isConceptBrand()).toBe(false);
  });
});