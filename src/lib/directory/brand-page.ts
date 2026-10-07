export function showBrandConceptNotice(affiliated: boolean | null | undefined) {
  return affiliated === false;
}

export function relatedBrandReason(current: { category: string; moods: string[] }, other: { category: string; moods: string[] }) {
  return other.moods.find((m) => current.moods.includes(m)) ?? (other.category === current.category ? other.category : null);
}

/** The line under a related brand's name is always that brand's own category. */
export function relatedLabel(other: { category: string | null | undefined }) {
  return other.category ?? "";
}