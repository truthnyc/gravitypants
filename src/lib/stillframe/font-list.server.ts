import type { WebFont } from "./fonts.functions";

/** Shared server-side Google Fonts lookup for account and shop-token callers. */
export async function fetchGoogleFonts(): Promise<{ fonts: WebFont[]; live: boolean }> {
  const key = process.env["GOOGLE_FONTS_API_KEY"];
  if (!key) return { fonts: [], live: false };
  try {
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&capability=WOFF2&key=${encodeURIComponent(key)}`);
    if (!res.ok) return { fonts: [], live: false };
    const json = await res.json() as { items?: WebFont[] };
    return { fonts: (json.items ?? []).map((f) => ({ family: f.family, category: f.category, variants: f.variants, subsets: f.subsets ?? ["latin"] })), live: true };
  } catch { return { fonts: [], live: false }; }
}