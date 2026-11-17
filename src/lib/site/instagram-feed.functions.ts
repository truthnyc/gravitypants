/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reelCaption, reelHashtags } from "./instagram-caption";

export type InstagramReel = { id: string; brand: string; title: string; poster: string | null; video: string | null; caption: string; hashtags: string[]; moods: string[]; keywords: string[]; brandWebsite: string | null; publishedAt: string | null };

const PREFIX = "media:";

/** Staff only: live Aimanté reels with signed MP4 links and ready-to-paste captions. */
export const instagramFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InstagramReel[]> => {
    const { data: ok } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!ok) throw new Error("Admin role required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data } = await sb.from("directory_reels")
      .select("id, title, display_title, description, tags, moods, video_url, poster_url, published_at, directory_brands(name, website_url)")
      .eq("status", "live").order("published_at", { ascending: false }).limit(200);
    const rows = data ?? [];
    const paths = rows.flatMap((r: any) => [r.video_url, r.poster_url]).filter((p: string | null) => p?.startsWith(PREFIX)).map((p: string) => p.slice(PREFIX.length));
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: s } = await sb.storage.from("media").createSignedUrls(paths, 60 * 60 * 24);
      for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
    }
    const sign = (p: string | null) => (p?.startsWith(PREFIX) ? signed.get(p.slice(PREFIX.length)) ?? null : p);
    return rows.map((r: any) => {
      const brand = r.directory_brands?.name ?? "";
      const title = r.display_title || r.title || brand;
      return { id: r.id, brand, title, poster: sign(r.poster_url), video: sign(r.video_url), caption: reelCaption({ brand, title, description: r.description }), hashtags: reelHashtags(brand, [...(r.tags ?? []), ...(r.moods ?? [])]), moods: r.moods ?? [], keywords: (r.tags ?? []).filter((t: string) => !t.startsWith("#")), brandWebsite: r.directory_brands?.website_url ?? null, publishedAt: r.published_at };
    });
  });
