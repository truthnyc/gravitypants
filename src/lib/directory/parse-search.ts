/** Turns a typed sentence into Directory filters. Pure, so it can later be swapped for a model call. */
import { categorySlug, type Category } from "./directory";

export type ParsedSearch = {
  mood: string | null;
  categories: string[]; // category slugs
  occasion: string | null; // e.g. "A host" when several categories come from one occasion word
  brand: string | null; // brand slug
  /** Every picked tag: the mood plus at most one Occasion, Season and Setting. */
  tags: string[];
  leftoverText: string;
};

type Kind = "mood" | "occasion" | "season" | "setting";
const TAG_SYNONYMS: Record<string, string> = {
  christmas: "holiday", xmas: "holiday", holidays: "holiday", hanukkah: "holiday", gifts: "gift", present: "gift", presents: "gift",
  valentine: "valentine's", valentines: "valentine's", birthday: "celebration", party: "celebration", wedding: "wedding", weddings: "wedding",
  fall: "autumn", beach: "coastal", seaside: "coastal", city: "urban", mountains: "mountain", outdoors: "nature",
};

const MOOD_SYNONYMS: Record<string, string> = {
  cosy: "cozy", quiet: "calm", peaceful: "calm", luxury: "luxurious", fancy: "luxurious",
  dark: "moody", colourful: "vibrant", colorful: "vibrant",
};
const CATEGORY_WORDS: [string[], Category][] = [
  [["wine", "wines", "champagne", "sparkling"], "Food & Drink"],
  [["coffee", "food", "chocolate"], "Food & Drink"],
  [["fashion", "clothes", "clothing", "shoes", "coat", "coats"], "Fashion"],
  [["home", "bed", "interior", "interiors", "decor"], "Home & Living"],
  [["jewellery", "jewelry", "ring", "rings", "earrings"], "Jewelry & Watches"],
  [["fragrance", "perfume", "beauty"], "Beauty & Fragrance"],
  [["travel", "hotel", "hotels", "trip"], "Travel & Stays"],
  [["photo", "photos", "photography", "art", "print", "prints"], "Art & Photography"],
];
const OCCASIONS: Record<string, { label: string; categories: Category[] }> = {
  host: { label: "A host", categories: ["Food & Drink", "Home & Living"] },
  hostess: { label: "A host", categories: ["Food & Drink", "Home & Living"] },
  table: { label: "The table", categories: ["Food & Drink", "Home & Living"] },
  dinner: { label: "Dinner", categories: ["Food & Drink", "Home & Living"] },
  thanksgiving: { label: "Thanksgiving", categories: ["Food & Drink", "Home & Living"] },
};

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) ?? [];
const norm = (s: string) => words(s).join(" ");

export function parseSearch(text: string, catalog: { moods: string[]; brands: { name: string; slug: string }[]; kinds?: Partial<Record<Kind, string[]>>; aliases?: Record<string, string> }): ParsedSearch {
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
  const kindOf = new Map<string, Kind>();
  for (const k of ["occasion", "season", "setting"] as const) for (const n of catalog.kinds?.[k] ?? []) kindOf.set(n.toLowerCase(), k);
  const aliases = catalog.aliases ?? {};
  const picked: Partial<Record<Kind, string>> = {};
  // Two-word tags such as "black friday" first.
  ws.forEach((w, i) => {
    const two = `${w} ${ws[i + 1] ?? ""}`;
    const k = kindOf.get(two);
    if (k && !used.has(i) && !used.has(i + 1) && !picked[k]) { picked[k] = two; used.add(i); used.add(i + 1); }
  });
  let mood: string | null = null;
  let occasion: string | null = null;
  const cats: Category[] = [];
  ws.forEach((w, i) => {
    if (used.has(i)) return;
    const isCategory = CATEGORY_WORDS.some(([list]) => list.includes(w));
    const t = aliases[w] ?? TAG_SYNONYMS[w] ?? w;
    const k = isCategory ? undefined : kindOf.get(t);
    if (k) { if (!picked[k]) picked[k] = t; used.add(i); return; }
    if (!isCategory && !moodSet.has(w) && moodSet.has(t)) { if (!mood) mood = t; used.add(i); return; }
    const m = moodSet.has(w) ? w : MOOD_SYNONYMS[w] && moodSet.has(MOOD_SYNONYMS[w]!) ? MOOD_SYNONYMS[w]! : null;
    if (m && !mood) { mood = m; used.add(i); return; }
    const o = OCCASIONS[w];
    if (o) { occasion ??= o.label; for (const c of o.categories) if (!cats.includes(c)) cats.push(c); used.add(i); return; }
    const hit = CATEGORY_WORDS.find(([list]) => list.includes(w));
    if (hit) { if (!cats.includes(hit[1])) cats.push(hit[1]); used.add(i); }
  });
  // An occasion label only describes the selection when nothing else was added.
  if (occasion && cats.length !== 2) occasion = null;

  const tags = [mood, picked.occasion, picked.season, picked.setting].filter((x): x is string => !!x);
  return { mood, categories: cats.map(categorySlug), occasion, brand, tags, leftoverText: ws.filter((_, i) => !used.has(i)).join(" ") };
}
