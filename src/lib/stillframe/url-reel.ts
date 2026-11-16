/* Pure rules for "Create from a product link": template choice, frame layout and parsing the AI drafts. */
import { z } from "zod";
import type { Format } from "./types";

export const DRAFT_COUNT = 3;
export const FRAMES_PER_DRAFT = 3;
export const MAX_PRODUCT_PHOTOS = 6;
export const MIN_PHOTO_SIDE = 600;

export type DraftSlide = { photo: number; headline: string; subline: string };
export type ReelDraft = { templateId: string; templateName: string; angle: string; slides: DraftSlide[] };
export type DraftProduct = { name: string; price: number | null; currency: string | null; url: string };

type TemplateLike = { id: string; name: string; format?: string | null; featured?: boolean; source?: string; status?: string | null; sort_order?: number };

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

/** Which photo each frame shows: walks the photos in order and repeats them when there are fewer than frames. */
export const framePhotos = (photoCount: number, frames = FRAMES_PER_DRAFT) =>
  Array.from({ length: frames }, (_, i) => (photoCount ? i % photoCount : 0));

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

/** Plain drafts used when the AI gives nothing usable: name, a short line, then the price. */
export function fallbackStory(p: DraftProduct): { angle: string; lines: [string, string][] } {
  const name = clean(p.name, 6) || "New arrival";
  return { angle: "Simple", lines: [[name, ""], ["Made to be noticed", ""], ["Shop now", priceLine(p.price, p.currency)]] };
}

/** Reads the AI reply into exactly `count` stories of three frames each; gaps are filled from the fallback. */
export function parseStories(text: string, p: DraftProduct, count = DRAFT_COUNT): { angle: string; lines: [string, string][] }[] {
  let raw: unknown[] = [];
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { const j = JSON.parse(m[0]); if (Array.isArray(j?.drafts)) raw = j.drafts; } catch { /* use fallback */ } }
  const out: { angle: string; lines: [string, string][] }[] = [];
  for (const d of raw) {
    const frames = Array.isArray((d as { frames?: unknown })?.frames) ? (d as { frames: unknown[] }).frames : [];
    const lines = frames.slice(0, FRAMES_PER_DRAFT).map((f) => [clean((f as { headline?: unknown })?.headline, 6), clean((f as { subline?: unknown })?.subline, 10)] as [string, string]);
    if (lines.length < FRAMES_PER_DRAFT || lines.some(([h]) => !h)) continue;
    out.push({ angle: clean((d as { angle?: unknown }).angle, 4) || "Story", lines });
    if (out.length >= count) break;
  }
  while (out.length < count) out.push(fallbackStory(p));
  return out;
}

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
