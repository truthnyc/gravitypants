import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WebFont = { family: string; category: string; variants: string[]; subsets?: string[] };

let cache: { at: number; fonts: WebFont[] } | null = null;
const DAY = 24 * 60 * 60 * 1000;

/** Google Fonts list, sorted by popularity, cached for 24h. Returns [] when no API key is set. */
export const listGoogleFonts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  if (cache && Date.now() - cache.at < DAY) return { fonts: cache.fonts, live: true };
  const { fetchGoogleFonts } = await import("./font-list.server");
  const result = await fetchGoogleFonts();
  if (result.live) cache = { at: Date.now(), fonts: result.fonts };
  return result;
});
