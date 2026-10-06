import { z } from "zod";

/** Public Directory page settings, edited at Admin → Directory settings (stored in site_settings key "directory"). */
export const directorySettingsSchema = z.object({
  showCarousel: z.boolean(),
  title: z.string().trim().min(1).max(60),
  source: z.enum(["manual", "auto"]),
  rule: z.enum(["newest", "viewed", "saved", "random"]),
  ruleMoods: z.array(z.string().max(30)).max(20),
  ruleCategories: z.array(z.string().max(60)).max(20),
  ruleBrands: z.array(z.string().max(60)).max(40),
  count: z.number().int().min(6).max(20),
  speed: z.enum(["slow", "normal", "fast"]),
  whenFiltering: z.enum(["follow", "fixed", "hide"]),
  rotateWeekly: z.boolean(),
  showFrom: z.string().max(40).nullable(),
  showUntil: z.string().max(40).nullable(),
  comingSoon: z.boolean(),
  pageSize: z.number().int().min(8).max(48),
  autoLoadPages: z.number().int().min(0).max(5),
  headlineMoods: z.array(z.string().max(30)).max(100),
});
export type DirectorySettings = z.infer<typeof directorySettingsSchema>;

export const DEFAULT_DIRECTORY_SETTINGS: DirectorySettings = {
  showCarousel: true, title: "Featured this week", source: "auto", rule: "newest",
  ruleMoods: [], ruleCategories: [], ruleBrands: [], count: 12, speed: "normal", whenFiltering: "follow",
  rotateWeekly: false, showFrom: null, showUntil: null,
  comingSoon: true, pageSize: 12, autoLoadPages: 3, headlineMoods: [],
};
export const SPEED_SECONDS: Record<DirectorySettings["speed"], number> = { slow: 9, normal: 6, fast: 4 };
export const MIN_MANUAL_PICKS = 4;

export const pickSchema = z.object({ reelId: z.string().uuid(), kind: z.enum(["directory", "site"]), week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() });
export type FeaturedPick = z.infer<typeof pickSchema>;

/** Saved settings merged over the defaults, so new fields always have a value. */
export function mergeSettings(saved: unknown): DirectorySettings {
  const r = directorySettingsSchema.partial().safeParse(saved ?? {});
  const out: DirectorySettings = { ...DEFAULT_DIRECTORY_SETTINGS };
  if (r.success) for (const [k, v] of Object.entries(r.data)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Monday (UTC) of the week containing `d`, as YYYY-MM-DD. */
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** Whether the band is inside its optional show-from/until window. */
export function inWindow(s: DirectorySettings, now: Date): boolean {
  if (s.showFrom && now < new Date(s.showFrom)) return false;
  if (s.showUntil && now > new Date(s.showUntil)) return false;
  return true;
}

type PoolReel = { id: string; moods: string[]; cat_slug: string; brand_slug: string };

/** Picks the featured reel ids: hand-picked (this week's list when rotating), else the automatic rule. */
export function resolveFeatured<T extends PoolReel>(s: DirectorySettings, picks: FeaturedPick[], pool: T[], now: Date, saves: Record<string, number> = {}): T[] {
  if (!s.showCarousel || !inWindow(s, now)) return [];
  const byId = new Map(pool.map((r) => [r.id, r]));
  if (s.source === "manual" || s.rotateWeekly) {
    const week = s.rotateWeekly ? mondayOf(now) : null;
    const chosen = picks.filter((p) => p.week === week).map((p) => byId.get(p.reelId)).filter((r): r is T => !!r);
    if (chosen.length) return chosen.slice(0, s.count);
    if (!s.rotateWeekly) return [];
  }
  let list = pool.filter((r) =>
    (!s.ruleMoods.length || r.moods.some((m) => s.ruleMoods.includes(m))) &&
    (!s.ruleCategories.length || s.ruleCategories.includes(r.cat_slug)) &&
    (!s.ruleBrands.length || s.ruleBrands.includes(r.brand_slug)));
  if (s.rule === "saved") list = [...list].sort((a, b) => (saves[b.id] ?? 0) - (saves[a.id] ?? 0));
  if (s.rule === "random") {
    // Same shuffle all week, so the band doesn't change on every visit.
    let seed = [...mondayOf(now)].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    list = [...list].map((r) => [rnd(), r] as const).sort((a, b) => a[0] - b[0]).map(([, r]) => r);
  }
  return list.slice(0, s.count);
}
