import { GP_ORIGIN } from "@/lib/site/brand-site";

/** Everything here is browser-safe: no server imports, so any page can build an embed snippet. */

/** A reel a client can put on their own website. */
export type EmbedTarget = { id: string; title: string; format: string };

/** The shape a reel opens at, and the three sizes a client can pick. */
const BASE: Record<string, { w: number; h: number }> = {
  "9:16": { w: 360, h: 640 },
  "4:5": { w: 480, h: 600 },
  "1:1": { w: 500, h: 500 },
  "5:4": { w: 540, h: 432 },
  "16:9": { w: 640, h: 360 },
};

export const EMBED_SIZES = [
  { scale: 0.75, label: "Small" },
  { scale: 1, label: "Medium" },
  { scale: 1.5, label: "Large" },
] as const;

/** Directory ("9x16") and website ("916") shape codes both come back as the shared "9:16" form. */
export function embedFormat(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (digits === "916") return "9:16";
  if (digits === "45") return "4:5";
  if (digits === "11") return "1:1";
  if (digits === "54") return "5:4";
  if (digits === "169") return "16:9";
  return BASE[raw ?? ""] ? raw! : "9:16";
}

/** Pixel size of the frame for a reel's shape at one of the three choices. */
export function embedSize(format: string, scale: number): { w: number; h: number } {
  const base = BASE[embedFormat(format)] ?? BASE["9:16"]!;
  return { w: Math.round(base.w * scale), h: Math.round(base.h * scale) };
}

/** The reel's own page, always on gravitypants.com so it works from any website. */
export const embedUrl = (id: string) => `${GP_ORIGIN}/embed/reel/${encodeURIComponent(id)}`;

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The one line a client pastes into their website's HTML. */
export function embedCode(id: string, size: { w: number; h: number }, title: string): string {
  return `<iframe src="${embedUrl(id)}" width="${size.w}" height="${size.h}" title="${escapeAttr(title)}" style="border:0;border-radius:8px" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
}
