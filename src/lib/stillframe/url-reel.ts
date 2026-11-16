/* Pure rules for "Create from a product link": template choice, frame layout and parsing the AI drafts. */
import { z } from "zod";
import type { Format } from "./types";

export const DRAFT_COUNT = 3;
export const MAX_PRODUCT_PHOTOS = 6;
export const MIN_PHOTO_SIDE = 600;

export type DraftSlide = { photo: number; headline: string; subline: string };
export type ReelDraft = { templateId: string; templateName: string; angle: string; shape: { id: ShapeId; name: string }; builtOn: string[]; slides: DraftSlide[] };
export type DraftProduct = { name: string; price: number | null; currency: string | null; url: string };

type TemplateLike = { id: string; name: string; slideCount?: number; format?: string | null; featured?: boolean; source?: string; status?: string | null; sort_order?: number };

/** Up to three different published templates: ones made for this size first (featured before others), then
 *  other sizes, which the ad refits to the chosen size — so a size without its own templates still gets three drafts. */
export function pickDraftTemplates<T extends TemplateLike>(templates: T[], format: Format, n = DRAFT_COUNT): T[] {
  const usable = templates.filter((t) => (t.status ?? "published") === "published");
  const fits = (t: T) => !t.format || t.format === format;
  const ordered = [
    ...usable.filter((t) => fits(t) && t.featured), ...usable.filter((t) => fits(t) && !t.featured),
    ...usable.filter((t) => !fits(t) && t.featured), ...usable.filter((t) => !fits(t) && !t.featured),
  ];
  const seen = new Set<string>();
  return ordered.filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, n);
}

/** One template per draft from the candidates: each draft takes the unused template whose own slide count is closest
 *  to its frame count (candidate order breaks ties), so a four-frame story isn't squeezed into a two-slide template. */
export function matchTemplates<T extends TemplateLike>(candidates: T[], frameCounts: number[]): T[] {
  const used = new Set<string>();
  return frameCounts.map((n) => {
    let best: T | undefined; let bestGap = Infinity;
    for (const t of candidates) {
      if (used.has(t.id)) continue;
      const gap = Math.abs((t.slideCount ?? n) - n);
      if (gap < bestGap) { best = t; bestGap = gap; }
    }
    best ??= candidates[0];
    if (best) used.add(best.id);
    return best!;
  }).filter(Boolean);
}

/** Price as shown on the last frame, or empty when the page gave none. */
export function priceLine(price: number | null, currency: string | null): string {
  if (price == null || price <= 0) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD", minimumFractionDigits: price % 1 === 0 ? 0 : 2 }).format(price);
  } catch { return `${price} ${currency ?? ""}`.trim(); }
}

const clean = (s: unknown, max: number) => {
  const t = String(s ?? "").replace(/["“”#]/g, "").replace(/\s+/g, " ").trim();
  const words = t.split(" ");
  return words.length > max ? words.slice(0, max).join(" ") : t;
};

/* ---------- Product brief (what the page says, checked against the page) ---------- */

export type BriefFact = { text: string; quote: string };
export type PhotoRole = "hero" | "detail" | "in_use" | "scale" | "packaging" | "other";
export type BriefPhoto = { index: number; shows: string; role: PhotoRole; usable: boolean };
export type ProductBrief = {
  what_it_is: string; who_its_for: string | null; facts: BriefFact[]; difference: string | null;
  feeling: string; voice: string | null; photos: BriefPhoto[];
};

const roleEnum = z.enum(["hero", "detail", "in_use", "scale", "packaging", "other"]);
const briefSchema = z.object({
  what_it_is: z.string().min(1),
  who_its_for: z.string().nullable().optional(),
  facts: z.array(z.object({ text: z.string(), quote: z.string() })).max(12).default([]),
  difference: z.string().nullable().optional(),
  feeling: z.string().default(""),
  voice: z.string().nullable().optional(),
  photos: z.array(z.object({ index: z.number().int(), shows: z.string().default(""), role: roleEnum.catch("other"), usable: z.boolean().default(true) })).default([]),
});

const norm = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();

/** Keeps only facts whose quote really appears in the page text, so no claim is invented. */
export function verifyFacts(facts: BriefFact[], sources: string[]): BriefFact[] {
  const hay = norm(sources.join(" \n "));
  return facts.filter((f) => { const q = norm(f.quote ?? ""); return q.length >= 3 && f.text.trim() && hay.includes(q); }).slice(0, 6);
}

/** The brief used when the AI gives nothing usable: the name, no facts, every photo usable. */
export function minimalBrief(name: string, photoCount: number): ProductBrief {
  return {
    what_it_is: name, who_its_for: null, facts: [], difference: null, feeling: "", voice: null,
    photos: Array.from({ length: photoCount }, (_, index) => ({ index, shows: "", role: "other" as const, usable: true })),
  };
}

/** Reads the AI reply into a checked brief, or null when it isn't valid JSON of the right shape. */
export function parseBrief(text: string, sources: string[], photoCount: number): ProductBrief | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j: unknown;
  try { j = JSON.parse(m[0]); } catch { return null; }
  const r = briefSchema.safeParse(j);
  if (!r.success) return null;
  const b = r.data;
  const facts = verifyFacts(b.facts, sources);
  const photos = Array.from({ length: photoCount }, (_, index) => {
    const p = b.photos.find((x) => x.index === index);
    return p ? { index, shows: p.shows.slice(0, 80), role: p.role, usable: p.usable } : { index, shows: "", role: "other" as const, usable: true };
  });
  if (photos.length && !photos.some((p) => p.usable)) photos[0]!.usable = true;
  const opt = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
  return {
    what_it_is: b.what_it_is.trim(), who_its_for: opt(b.who_its_for), facts,
    // "difference" must rest on facts; with none verified it is dropped.
    difference: facts.length ? opt(b.difference) : null,
    feeling: b.feeling.trim(), voice: opt(b.voice), photos,
  };
}

/* ---------- Photo checks ---------- */

/** Same photo at another size or with other query parameters. */
export const photoKey = (u: string) => u.replace(/[?#].*$/, "").replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/i, "").replace(/-\d+x\d+(?=\.[a-z]+$)/i, "").toLowerCase();

/** Width and height read from a JPEG, PNG or WebP header, or null when unknown. */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const u16 = (i: number) => (b[i]! << 8) | b[i + 1]!;
  const le16 = (i: number) => b[i]! | (b[i + 1]! << 8);
  const u32 = (i: number) => ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { width: u32(16), height: u32(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]!;
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
      const len = u16(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: u16(i + 7), height: u16(i + 5) };
      i += 2 + len;
    }
    return null;
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...b.slice(12, 16));
    if (kind === "VP8 ") return { width: le16(26) & 0x3fff, height: le16(28) & 0x3fff };
    if (kind === "VP8L") { const v = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24); return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }; }
    if (kind === "VP8X") return { width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)), height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)) };
  }
  return null;
}

/** A photo is kept when its short side is at least 600 px. */
export const bigEnough = (s: { width: number; height: number } | null) => !!s && Math.min(s.width, s.height) >= MIN_PHOTO_SIDE;

/* ---------- Story shapes (what each draft tells) ---------- */

export type ShapeId = "why" | "made" | "moment" | "detail" | "simple";
export type StoryShape = { id: ShapeId; name: string; when: string; roles: string[] };

export const STORY_SHAPES: StoryShape[] = [
  { id: "why", name: "Why it exists", when: "Needs who it's for or a fact about what it does.", roles: ["the problem or wish", "the product as the answer", "proof", "ask"] },
  { id: "made", name: "How it's made", when: "Needs two facts about material, origin or making, and a detail photo.", roles: ["a material or origin", "the making or the detail up close", "the finished piece", "ask"] },
  { id: "moment", name: "A moment with it", when: "Needs a photo of it in use.", roles: ["the scene", "the feeling", "the product in it", "ask"] },
  { id: "detail", name: "Look closer", when: "Needs two detail or hero photos and two facts.", roles: ["one detail", "a second detail", "the whole product", "ask"] },
  { id: "simple", name: "Just the product", when: "The fallback when little is known.", roles: ["the product", "one fact", "ask"] },
];
export const shapeById = (id: string) => STORY_SHAPES.find((x) => x.id === id);

const MAKING = /\b(made|handmade|hand-|crafted|woven|knit|sewn|stitched|forged|thrown|carved|milled|roasted|brewed|grown|sourced|origin|cotton|wool|linen|silk|leather|cashmere|merino|wood|oak|walnut|steel|brass|copper|ceramic|stoneware|porcelain|glass|clay|organic|recycled|fiber|fibre|yarn|cocoa|beans?)\b/i;

/** Shapes the brief can honestly support; "simple" is always allowed. */
export function allowedShapes(brief: ProductBrief): ShapeId[] {
  const usable = brief.photos.filter((p) => p.usable);
  const role = (r: PhotoRole) => usable.filter((p) => p.role === r).length;
  const out: ShapeId[] = [];
  if (brief.who_its_for || brief.facts.length >= 1) out.push("why");
  if (brief.facts.filter((f) => MAKING.test(f.text)).length >= 2 && role("detail") >= 1) out.push("made");
  if (role("in_use") >= 1) out.push("moment");
  if (role("detail") + role("hero") >= 2 && brief.facts.length >= 2) out.push("detail");
  out.push("simple");
  return out;
}

export const BANNED_PHRASES = [
  "made to be noticed", "elevate your", "discover", "experience the", "redefined", "meet your new favorite",
  "like never before", "timeless", "effortless", "your new go-to", "take it to the next level",
];

export type RawFrame = { role: string; photo: number; headline: string; subline: string; fact: number | null };
export type RawDraft = { shape: string; frames: RawFrame[] };

const tidy = (s: unknown, maxWords: number) => {
  const t = String(s ?? "").replace(/["“”#]/g, "").replace(/\s+/g, " ").trim();
  const w = t.split(" ");
  return w.length > maxWords ? w.slice(0, maxWords).join(" ") : t;
};

/** Reads the AI reply into drafts with 3 to 5 frames; anything else is skipped. */
export function parseDrafts(text: string): RawDraft[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  let j: any;
  try { j = JSON.parse(m[0]); } catch { return []; }
  const list: any[] = Array.isArray(j?.drafts) ? j.drafts : [];
  return list.map((d) => ({
    shape: String(d?.shape ?? ""),
    frames: (Array.isArray(d?.frames) ? d.frames : []).slice(0, MAX_FRAMES).map((f: any) => ({
      role: tidy(f?.role, 8), photo: Number.isInteger(f?.photo) ? f.photo : -1,
      // Long headlines are kept long so the check below can reject them rather than cut them mid-thought.
      headline: tidy(f?.headline, 20), subline: tidy(f?.subline, 14),
      fact: Number.isInteger(f?.fact) ? f.fact : null,
    })),
  }));
}

export const MIN_FRAMES = 3;
export const MAX_FRAMES = 5;
const MONEY = /([$€£¥]\s?\d|\d[\d.,]*\s?(usd|eur|gbp|dollars?|euros?)\b|\d+\s?%\s?off|\bfree shipping\b|\bsale\b|\bdiscount)/i;

/** Why a draft can't be used; empty when it passes. */
export function checkDraft(d: RawDraft, brief: ProductBrief, price: string, given: string[] = []): string[] {
  const reasons: string[] = [];
  const shape = shapeById(d.shape);
  if (!shape) reasons.push("unknown shape");
  if (d.frames.length < MIN_FRAMES || d.frames.length > MAX_FRAMES) reasons.push(`needs ${MIN_FRAMES} to ${MAX_FRAMES} frames`);
  const usable = new Set(brief.photos.filter((p) => p.usable).map((p) => p.index));
  if (d.frames.some((f) => !usable.has(f.photo))) reasons.push("uses a missing or unusable photo");
  if (d.frames.some((f) => !f.headline)) reasons.push("a frame has no headline");
  const factFrames = d.frames.filter((f) => f.fact != null && f.fact >= 0 && f.fact < brief.facts.length).length;
  if (d.shape !== "simple" && brief.facts.length >= 2 && factFrames < 2) reasons.push("fewer than two frames carry a fact");
  if (d.frames.some((f) => f.headline.split(" ").filter(Boolean).length > 9)) reasons.push("a headline is longer than 9 words");
  const all = d.frames.map((f) => `${f.headline} ${f.subline}`).join(" \n ").toLowerCase();
  const banned = BANNED_PHRASES.find((b) => all.includes(b));
  if (banned) reasons.push(`uses the empty phrase "${banned}"`);
  const heads = d.frames.map((f) => f.headline.toLowerCase());
  if (new Set(heads).size !== heads.length) reasons.push("two frames have the same headline");
  // The given price and the person's own words (e.g. "Free shipping this week") are allowed; anything else about money isn't.
  const withoutPrice = [price, ...given].filter(Boolean).reduce((t, g) => t.split(g.toLowerCase()).join(" "), all);
  if (MONEY.test(withoutPrice)) reasons.push("mentions a price or offer that wasn't given");
  return reasons;
}

/** Plain draft when the AI gives nothing usable: the product, its first fact when there is one, then the ask and price. */
export function fallbackDraft(p: DraftProduct, brief: ProductBrief): RawDraft {
  const photos = brief.photos.filter((x) => x.usable).map((x) => x.index);
  const ph = (i: number) => (photos.length ? photos[i % photos.length]! : 0);
  const name = tidy(p.name, 6) || "New arrival";
  const fact = brief.facts[0];
  const frames: RawFrame[] = [{ role: "the product", photo: ph(0), headline: name, subline: "", fact: null }];
  if (fact) frames.push({ role: "one fact", photo: ph(1), headline: tidy(fact.text, 9), subline: "", fact: 0 });
  frames.push({ role: "ask", photo: ph(frames.length), headline: "Shop now", subline: priceLine(p.price, p.currency), fact: null });
  return { shape: "simple", frames };
}

/** Shopify serves photos at any width; asks for a large one so a thumbnail link doesn't fail the size rule. */
export function largerPhotoUrl(u: string): string {
  try {
    const x = new URL(u);
    if (!(x.hostname === "cdn.shopify.com" || x.pathname.includes("/cdn/shop/"))) return u;
    x.pathname = x.pathname.replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/i, "");
    ["width", "height", "crop"].forEach((k) => x.searchParams.delete(k));
    x.searchParams.set("width", "2000");
    return x.toString();
  } catch { return u; }
}

/** Shopify product page → its `/products/<handle>.js` address, which lists every product photo; null elsewhere. */
export function shopifyProductJs(pageUrl: string, html: string): string | null {
  if (!/cdn\.shopify\.com|\/cdn\/shop\/|Shopify\.theme/i.test(html)) return null;
  try { const x = new URL(pageUrl); const m = x.pathname.match(/\/products\/([^/?#]+)/); return m ? `${x.origin}/products/${m[1]}.js` : null; } catch { return null; }
}

/* ---------- The person's corrections ("What we understood") ---------- */

export const DIFFERENCE_MAX = 140;
export const MUST_SAY_MAX = 120;
export type BriefEdits = { keepFacts: number[]; keepPhotos: string[]; difference: string | null; mustSay: string | null };

/** Applies only the allowed edits to the server's own brief: kept facts are picked by index from what the server
 *  produced (browser text is never read), kept photos by id, and the person's own difference/must-say lines become given facts. */
export function applyEdits<P extends { assetId: string }>(brief: ProductBrief, photos: P[], e: BriefEdits): { brief: ProductBrief; photos: P[]; given: string[] } | null {
  const keepIdx = new Set(e.keepFacts.filter((i) => Number.isInteger(i) && i >= 0 && i < brief.facts.length));
  const facts = brief.facts.filter((_, i) => keepIdx.has(i));
  const keepIds = new Set(e.keepPhotos);
  const kept = photos.map((p, i) => ({ p, i })).filter(({ p }) => keepIds.has(p.assetId));
  if (!kept.length) return null;
  const notes = kept.map(({ i }, index) => {
    const n = brief.photos.find((x) => x.index === i);
    // A photo the person keeps is usable, even one the brief had turned off.
    return { index, shows: n?.shows ?? "", role: n?.role ?? ("other" as const), usable: true };
  });
  const diff = (e.difference ?? "").replace(/\s+/g, " ").trim().slice(0, DIFFERENCE_MAX) || null;
  const must = (e.mustSay ?? "").replace(/\s+/g, " ").trim().slice(0, MUST_SAY_MAX) || null;
  const given = [diff, must].filter((x): x is string => !!x);
  for (const g of given) if (!facts.some((f) => f.text.toLowerCase() === g.toLowerCase())) facts.push({ text: g, quote: g });
  return { brief: { ...brief, facts, difference: diff, photos: notes }, photos: kept.map(({ p }) => p), given };
}
