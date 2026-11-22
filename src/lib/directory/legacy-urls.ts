import { legacyCategorySlug } from "./directory";

/** Renamed moods (mirrors the mood_aliases table) so old links redirect to the current name. */
export const MOOD_ALIASES: Record<string, string> = {
  serene: "calm", soothing: "calm", relaxed: "calm", dark: "moody", fun: "playful", cheerful: "playful",
  lively: "energetic", dynamic: "energetic", punchy: "energetic", urgent: "energetic", refined: "elegant",
  sophisticated: "elegant", warm: "cozy", organic: "natural", heritage: "timeless", indulgent: "luxurious",
  cold: "winter", sunny: "summer", celebratory: "celebration", festive: "holiday",
};

const remap = (v: string | undefined, one: (x: string) => string) => {
  if (!v) return v;
  const out = [...new Set(v.split(",").map((x) => one(x.trim().toLowerCase())).filter(Boolean))].join(",");
  return out;
};
export const canonicalMoods = (v: string | undefined) => remap(v, (m) => MOOD_ALIASES[m] ?? m);
export const canonicalCategories = (v: string | undefined) => remap(v, (c) => legacyCategorySlug(c) ?? c);

/** Search params with old category/mood names replaced, or null when nothing changes. */
export function canonicalDirectorySearch<T extends { category?: string | undefined; mood?: string | undefined }>(s: T): T | null {
  const category = canonicalCategories(s.category);
  const mood = canonicalMoods(s.mood);
  if (category === s.category && mood === s.mood) return null;
  const next = { ...s };
  if (category === undefined) delete next.category; else next.category = category;
  if (mood === undefined) delete next.mood; else next.mood = mood;
  return next;
}
