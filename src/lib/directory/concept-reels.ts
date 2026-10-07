/** Only brands explicitly identified as non-participants, including existing reel labels. */
const CONCEPT_BRANDS = new Set([
  "agnona",
  "maison-francis-kurkdjian",
  "baccarat-rouge-540",
]);

export function isConceptBrand(name?: string | null, slug?: string | null): boolean {
  return [name, slug].some((value) => value != null && CONCEPT_BRANDS.has(
    value.trim().toLowerCase().replace(/^visit\s+/, "").replace(/\s+/g, "-"),
  ));
}

export const CONCEPT_REEL_NOTICE = "Concept reels by Gravity Pants. Not affiliated with or endorsed by the brand.";