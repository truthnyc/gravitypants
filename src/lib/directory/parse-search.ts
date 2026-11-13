/** Turns a typed sentence into Directory filters. Pure, so it can later be swapped for a model call. */
import { categorySlug, type Category } from "./directory";

export type ParsedSearch = {
  mood: string | null;
  categories: string[]; // category slugs
  occasion: string | null; // e.g. "A host" when several categories come from one occasion word
  brand: string | null; // brand slug
  leftoverText: string;
};

const MOOD_SYNONYMS: Record<string, string> = {
  cosy: "cozy", quiet: "calm", peaceful: "calm", luxury: "luxurious", fancy: "luxurious",
  dark: "moody", colourful: "vibrant", colorful: "vibrant",
};
const CATEGORY_WORDS: [string[], Category][] = [
  [["wine", "wines", "champagne", "sparkling"], "Wine & Spirits"],
  [["coffee", "food", "chocolate"], "Food & Drink"],
  [["fashion", "clothes", "clothing", "shoes", "coat", "coats"], "Fashion & Apparel"],
  [["home", "bed", "interior", "interiors", "decor"], "Home & Living"],
  [["jewellery", "jewelry", "ring", "rings", "earrings"], "Jewelry & Watches"],
  [["fragrance", "perfume", "beauty"], "Beauty & Fragrance"],
  [["travel", "hotel", "hotels", "trip"], "Travel & Hospitality"],
  [["photo", "photos", "photography", "art", "print", "prints"], "Photography & Visual Arts"],
];
const OCCASIONS: Record<string, { label: string; categories: Category[] }> = {
  host: { label: "A host", categories: ["Wine & Spirits", "Food & Drink", "Home & Living"] },
  hostess: { label: "A host", categories: ["Wine & Spirits", "Food & Drink", "Home & Living"] },
  table: { label: "The table", categories: ["Wine & Spirits", "Food & Drink", "Home & Living"] },
  dinner: { label: "Dinner", categories: ["Wine & Spirits", "Food & Drink", "Home & Living"] },
  thanksgiving: { label: "Thanksgiving", categories: ["Wine & Spirits", "Food & Drink", "Home & Living"] },
};

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) ?? [];
const norm = (s: string) => words(s).join(" ");

export function parseSearch(text: string, catalog: { moods: string[]; brands: { name: string; slug: string }[] }): ParsedSearch {
  const ws = words(text);
  const used = new Set<number>();
  const hay = ` ${ws.join(" ")} `;

  // Brand: longest name first, whole-word match.
  let brand: string | null = null;
  for (const b of [...catalog.brands].sort((a, z) => z.name.length - a.name.length)) {
    const n = norm(b.name);
    if (n && hay.includes(` ${n} `)) {
      brand = b.slug;
      const parts = n.split(" ");
      ws.forEach((w, i) => { if (parts.includes(w)) used.add(i); });
      break;
    }
  }

  const moodSet = new Set(catalog.moods.map((m) => m.toLowerCase()));
  let mood: string | null = null;
  let occasion: string | null = null;
  const cats: Category[] = [];
  ws.forEach((w, i) => {
    if (used.has(i)) return;
    const m = moodSet.has(w) ? w : MOOD_SYNONYMS[w] && moodSet.has(MOOD_SYNONYMS[w]!) ? MOOD_SYNONYMS[w]! : null;
    if (m && !mood) { mood = m; used.add(i); return; }
    const o = OCCASIONS[w];
    if (o) { occasion ??= o.label; for (const c of o.categories) if (!cats.includes(c)) cats.push(c); used.add(i); return; }
    const hit = CATEGORY_WORDS.find(([list]) => list.includes(w));
    if (hit) { if (!cats.includes(hit[1])) cats.push(hit[1]); used.add(i); }
  });
  // An occasion label only describes the selection when nothing else was added.
  if (occasion && cats.length !== 3) occasion = null;

  return { mood, categories: cats.map(categorySlug), occasion, brand, leftoverText: ws.filter((_, i) => !used.has(i)).join(" ") };
}
