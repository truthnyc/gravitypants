import type { Format } from "./types";

/** Export output sizes and the platform shortcuts that select them. One place to change the mapping. */
export type SizeId = "9x16" | "4x5" | "1x1" | "16x9";
export type PlatformId = "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "website";

export type SizeDef = {
  id: SizeId;
  name: string;
  ratio: string;
  width: number;
  height: number;
  /** Built-in layout (logo/text positions) the renderer uses for this size. */
  layout: Format;
  badge?: string;
  uses: { label: string; platforms: PlatformId[] }[];
};

export const EXPORT_SIZES: SizeDef[] = [
  { id: "9x16", name: "Vertical", ratio: "9:16", width: 1080, height: 1920, layout: "9:16", uses: [
    { label: "Instagram Reels & Stories", platforms: ["instagram"] },
    { label: "TikTok", platforms: ["tiktok"] },
    { label: "YouTube Shorts", platforms: ["youtube"] },
    { label: "Facebook Stories & Reels", platforms: ["facebook"] },
  ] },
  { id: "4x5", name: "Portrait", ratio: "4:5", width: 1080, height: 1350, layout: "4:5", badge: "Recommended for feeds", uses: [
    { label: "Instagram feed", platforms: ["instagram"] },
    { label: "Facebook feed", platforms: ["facebook"] },
    { label: "LinkedIn feed", platforms: ["linkedin"] },
  ] },
  { id: "1x1", name: "Square", ratio: "1:1", width: 1080, height: 1080, layout: "1:1", uses: [
    { label: "Instagram & Facebook feed", platforms: ["instagram", "facebook"] },
    { label: "LinkedIn feed", platforms: ["linkedin"] },
    { label: "Marketplace & catalog", platforms: [] },
  ] },
  { id: "16x9", name: "Landscape", ratio: "16:9", width: 1920, height: 1080, layout: "16:9", uses: [
    { label: "YouTube", platforms: ["youtube"] },
    { label: "Website & banners", platforms: ["website"] },
    { label: "LinkedIn video", platforms: ["linkedin"] },
    { label: "Email header", platforms: [] },
  ] },
];

export const PLATFORMS: { id: PlatformId; name: string; sizes: SizeId[] }[] = [
  { id: "instagram", name: "Instagram", sizes: ["9x16", "4x5"] },
  { id: "tiktok", name: "TikTok", sizes: ["9x16"] },
  { id: "youtube", name: "YouTube", sizes: ["9x16", "16x9"] },
  { id: "facebook", name: "Facebook", sizes: ["9x16", "4x5"] },
  { id: "linkedin", name: "LinkedIn", sizes: ["1x1"] },
  { id: "website", name: "Website", sizes: ["16x9"] },
];

export const DEFAULT_SIZES: SizeId[] = ["9x16", "1x1"];
export const CUSTOM_MIN = 100;
export const CUSTOM_MAX = 4096;
export const CUSTOM_PRESETS = [
  { w: 1200, h: 628, label: "Link ad" },
  { w: 300, h: 250, label: "Banner" },
  { w: 728, h: 90, label: "Leaderboard" },
  { w: 1500, h: 500, label: "Header" },
];

const LEGACY: Record<string, SizeId> = {
  "ig-reels": "9x16", "instagram-reels": "9x16", tiktok: "9x16", "yt-shorts": "9x16", "youtube-shorts": "9x16",
  "ig-feed": "1x1", "instagram-feed": "1x1", linkedin: "1x1",
  youtube: "16x9", web: "16x9", "website-banner": "16x9",
};

const ORDER = EXPORT_SIZES.map((s) => s.id);

/** Maps saved size or legacy platform ids to size ids, de-duplicated, in card order. */
export function migrateSizes(ids: readonly string[]): SizeId[] {
  const out = new Set<SizeId>();
  for (const id of ids) {
    if ((ORDER as string[]).includes(id)) out.add(id as SizeId);
    else if (LEGACY[id]) out.add(LEGACY[id]);
  }
  return ORDER.filter((id) => out.has(id));
}

export function platformState(p: PlatformId, selected: ReadonlySet<SizeId>): "on" | "mixed" | "off" {
  const sizes = PLATFORMS.find((x) => x.id === p)!.sizes;
  const n = sizes.filter((s) => selected.has(s)).length;
  return n === sizes.length ? "on" : n ? "mixed" : "off";
}

/** All of the platform's sizes selected → deselect them; otherwise select them all. */
export function togglePlatform(p: PlatformId, selected: ReadonlySet<SizeId>): Set<SizeId> {
  const sizes = PLATFORMS.find((x) => x.id === p)!.sizes;
  const next = new Set(selected);
  if (platformState(p, selected) === "on") sizes.forEach((s) => next.delete(s));
  else sizes.forEach((s) => next.add(s));
  return next;
}

export function customError(w: number | null, h: number | null): string | null {
  const ok = (n: number | null) => n != null && Number.isInteger(n) && n >= CUSTOM_MIN && n <= CUSTOM_MAX;
  if (w == null && h == null) return "Enter a width and height.";
  if (!ok(w) || !ok(h)) return `Use whole numbers from ${CUSTOM_MIN} to ${CUSTOM_MAX} px.`;
  return null;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** "6:5" when tidy, otherwise "1.91:1". */
export function ratioLabel(w: number, h: number) {
  const g = gcd(w, h);
  const a = w / g, b = h / g;
  if (a <= 21 && b <= 21) return `${a}:${b}`;
  return `${Number((w / h).toFixed(2))}:1`;
}

export const exportFileName = (base: string, w: number, h: number, ext: "mp4" | "gif") => `${base}_${w}x${h}.${ext}`;

/** Readable size name for a saved file name, old or new style. */
export function sizeLabelForFile(name: string): string | null {
  const m = name.match(/_(\d+)x(\d+)\.(mp4|gif)$/i);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  const s = EXPORT_SIZES.find((x) => (x.width === a && x.height === b) || x.id === `${a}x${b}`);
  return s ? `${s.name} ${s.ratio}` : `Custom ${a} × ${b}`;
}
