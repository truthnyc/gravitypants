import { z } from "zod";

/** Editorial gift and mood guides on aimante.co (/guides). Pure, browser-safe. */
export const guideBrandSchema = z.object({ id: z.string().uuid(), why: z.string().trim().max(160) });
export const guideSectionSchema = z.object({
  heading: z.string().trim().min(1).max(120),
  body: z.string().trim().max(600),
  brands: z.array(guideBrandSchema).max(24),
});
export const guideInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.").max(80),
  title: z.string().trim().min(3).max(140),
  seo_title: z.string().trim().max(140),
  meta_description: z.string().trim().max(320),
  intro: z.string().trim().max(2400),
  sections: z.array(guideSectionSchema).max(20),
  cover_image: z.string().trim().url().max(1000).nullable(),
  moods: z.array(z.string().trim().toLowerCase().max(40)).max(12),
  categories: z.array(z.string().trim().max(80)).max(12),
  season: z.string().trim().toLowerCase().regex(/^[a-z0-9-]*$/).max(40).nullable(),
  season_label: z.string().trim().max(60).nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.enum(["draft", "published"]),
});
export type GuideInput = z.infer<typeof guideInput>;
export type GuideSection = z.infer<typeof guideSectionSchema>;

export type GuideSummary = { slug: string; title: string; intro: string; cover: string | null; moods: string[]; categories: string[]; season: string | null; updated_at: string };

/** Seasonal note: inside the dates a countdown/“on now”, outside them “Back for … next year”. */
export function seasonNote(g: { season: string | null; season_label: string | null; start_date: string | null; end_date: string | null }, now: Date): string | null {
  if (!g.season || !g.start_date || !g.end_date) return null;
  const label = g.season_label || g.season.replace(/-/g, " ");
  const yr = now.getUTCFullYear();
  // Dates repeat every year; only month and day matter.
  const at = (d: string, y: number) => Date.UTC(y, Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  const today = Date.UTC(yr, now.getUTCMonth(), now.getUTCDate());
  const start = at(g.start_date, yr), end = at(g.end_date, yr);
  if (today < start || today > end) return `Back for ${label} next year.`;
  const days = Math.round((end - today) / 86_400_000);
  return days === 0 ? `${cap(label)} is today.` : `${cap(label)} is in ${days} ${days === 1 ? "day" : "days"}.`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The guide for a homepage countdown event (e.g. "singles-day", "holiday-gifting" → "holiday"). */
export function guideForEvent<T extends { season: string | null }>(guides: T[], eventId: string | undefined): T | undefined {
  if (!eventId) return undefined;
  return guides.find((g) => g.season && (g.season === eventId || eventId.startsWith(`${g.season}-`)));
}

/** Up to `n` guides sharing a mood or category name. */
export function guidesMatching<T extends { moods: string[]; categories: string[] }>(guides: T[], kind: "mood" | "category", value: string, n = 3): T[] {
  const v = value.toLowerCase();
  return guides.filter((g) => (kind === "mood" ? g.moods : g.categories).some((x) => x.toLowerCase() === v)).slice(0, n);
}
