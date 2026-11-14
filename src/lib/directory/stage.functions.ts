import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchDirectory, searchDirectoryLegacy } from "./directory.functions";
import { listSiteReels } from "@/lib/site/reels.functions";
import { aimanteTitle } from "@/lib/site/reels";
import { supabase } from "@/integrations/supabase/client";

/** Public: the stage view's list, in the same order the Directory grid shows for the same filters and seed. */
export const getStage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ mood: z.string().max(60).nullable(), family: z.string().max(60).nullable(), categories: z.array(z.string().max(60)).max(20), seed: z.string().max(64) }).parse(d))
  .handler(async ({ data }) => {
    // A family plays every reel carrying any of its moods; an unknown family plays nothing.
    let moods = data.mood ? [data.mood] : [];
    if (!data.mood && data.family) {
      const { data: rows } = await supabase.from("moods").select("name, family");
      moods = (rows ?? []).filter((r) => r.family.toLowerCase() === data.family!.toLowerCase()).map((r) => r.name.toLowerCase());
      if (!moods.length) return { reels: [], cards: [], siteReels: [] };
    }
    const [res, cards, site] = await Promise.all([
      withRetry(() => searchDirectory({ data: { q: "", moods, categories: data.categories, brands: [], page: 1, pageSize: 240, seed: data.seed } })),
      searchDirectoryLegacy({ data: { q: "", size: null } }).catch(() => []),
      listSiteReels().then((rs) => rs.filter((r) => r.source !== "client").map((r) => ({ ...r, title: aimanteTitle(r) }))).catch(() => []),
    ]);
    return { reels: res.reels, cards, siteReels: site };
  });

/** A brief backend hiccup (e.g. a statement timeout) gets one more try before the page shows an error. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 400)); return fn(); }
}
