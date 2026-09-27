import { createServerFn } from "@tanstack/react-start";

export type WebFont = { family: string; category: string; variants: string[] };

let cache: { at: number; fonts: WebFont[] } | null = null;
const DAY = 24 * 60 * 60 * 1000;

/** Google Fonts list, sorted by popularity, cached for 24h. Returns [] when no API key is set. */
export const listGoogleFonts = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < DAY) return { fonts: cache.fonts, live: true };
  const key = process.env["GOOGLE_FONTS_API_KEY"];
  if (!key) return { fonts: [] as WebFont[], live: false };
  try {
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${encodeURIComponent(key)}`);
    if (!res.ok) return { fonts: [] as WebFont[], live: false };
    const json = (await res.json()) as { items?: { family: string; category: string; variants: string[] }[] };
    const fonts = (json.items ?? []).map((f) => ({ family: f.family, category: f.category, variants: f.variants }));
    cache = { at: Date.now(), fonts };
    return { fonts, live: true };
  } catch {
    return { fonts: [] as WebFont[], live: false };
  }
});
