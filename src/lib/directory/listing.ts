/** aimante.co /c/ and /mood/ pages with fewer brands than this stay out of the sitemap and carry noindex. */
export const MIN_LISTING_BRANDS = 3;

/** Distinct brands in a search result's brand facet. */
export function brandCount(facets: { brands: Record<string, number> } | undefined): number {
  return Object.values(facets?.brands ?? {}).filter((n) => n > 0).length;
}
