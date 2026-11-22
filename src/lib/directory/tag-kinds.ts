/** The four tag types stored in `moods.kind`, in the order used everywhere (admin and public site). */
export const TAG_KINDS = ["mood", "occasion", "season", "setting"] as const;
export type TagKind = (typeof TAG_KINDS)[number];
export const TAG_KIND_LABEL: Record<TagKind, string> = { mood: "Mood", occasion: "Occasion", season: "Season", setting: "Setting" };
/** URL search param for each kind on the Directory. */
export const TAG_KIND_PARAM = { mood: "mood", occasion: "occasion", season: "season", setting: "setting" } as const;
/** Only Mood is capped per reel; Occasion, Season and Setting are separate. */
export const REEL_MOODS_MAX = 3;
export const REEL_KIND_MAX = 6;

/** Splits a flat tag list into the four kinds. Unknown names count as Mood. */
export function splitByKind(tags: string[], kindOf: (n: string) => TagKind): Record<TagKind, string[]> {
  const out: Record<TagKind, string[]> = { mood: [], occasion: [], season: [], setting: [] };
  for (const t of tags) out[kindOf(t)].push(t);
  return out;
}

/** True when the Mood-kind tags stay within the per-reel cap. */
export function withinMoodCap(tags: string[], kindOf: (n: string) => TagKind) {
  return splitByKind(tags, kindOf).mood.length <= REEL_MOODS_MAX;
}

/** Keeps every Occasion/Season/Setting tag and the first three Mood tags. */
export function capMoodTags(tags: string[], kindOf: (n: string) => TagKind) {
  let n = 0;
  return tags.filter((t) => kindOf(t) !== "mood" || ++n <= REEL_MOODS_MAX);
}
