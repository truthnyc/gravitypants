/** Exact matching; website reels inherit their brand moods. */
export function matchesMood(selected: string | undefined, reelMoods: readonly string[] = [], brandMoods: readonly string[] = []) {
  return !selected || reelMoods.includes(selected) || brandMoods.includes(selected);
}
