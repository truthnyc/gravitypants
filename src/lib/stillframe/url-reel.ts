/* Pure rules for "Create from a product link": template choice, frame layout and parsing the AI drafts. */
import type { Format } from "./types";

export const DRAFT_COUNT = 3;
export const FRAMES_PER_DRAFT = 3;
export const MAX_PRODUCT_PHOTOS = 3;

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
