import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { embedFormat } from "./embed";

/** A published reel, ready to play inside another website's frame. */
export type EmbedReel = {
  id: string;
  title: string;
  brand: string;
  brandSlug: string | null;
  website: string | null;
  video: string;
  poster: string | null;
  format: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGN_SECONDS = 60 * 60 * 24;
const MEDIA = "media:";
const SITE = "site-reels:";

/** Signs one stored file. Only ever called for a row that already passed the public read rules. */
async function sign(ref: string | null | undefined, prefix: string, bucket: string): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("https://")) return ref;
  if (!ref.startsWith(prefix)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(ref.slice(prefix.length), SIGN_SECONDS);
  return data?.signedUrl ?? null;
}

/**
 * Public: one published reel for the embed player.
 * Accepts an ad's own id, a Directory reel row id, or a website reel id.
 * Access rules decide what is published: live Directory reels of visible brands, and published website reels.
 */
export const getEmbedReel = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().regex(UUID, "Unknown reel") }).parse(d))
  .handler(async ({ data }): Promise<EmbedReel | null> => {
    const { publicClient } = await import("./reels.server");
    const db = publicClient();

    const { data: dir } = await db
      .from("directory_reels")
      .select("id, ad_id, title, display_title, formats, video_url, poster_url, directory_brands(name, slug, website_url)")
      .or(`ad_id.eq.${data.id},id.eq.${data.id}`)
      .eq("status", "live")
      .maybeSingle();

    if (dir?.video_url) {
      const brand = dir.directory_brands as unknown as { name: string; slug: string; website_url: string | null } | null;
      const video = await sign(dir.video_url, MEDIA, "media");
      if (!video) return null;
      return {
        id: data.id,
        title: dir.display_title?.trim() || dir.title?.trim() || brand?.name || "Reel",
        brand: brand?.name ?? "Gravity Pants",
        brandSlug: brand?.slug ?? null,
        website: brand?.website_url ?? null,
        video,
        poster: await sign(dir.poster_url, MEDIA, "media"),
        format: embedFormat((dir.formats ?? [])[0]),
      };
    }

    const { data: site } = await db
      .from("site_reels")
      .select("id, brand, title, display_title, format, video_url, poster_url, href")
      .eq("id", data.id)
      .eq("published", true)
      .maybeSingle();
    if (!site) return null;
    const video = await sign(site.video_url, SITE, "site-reels");
    if (!video) return null;
    return {
      id: site.id,
      title: site.display_title?.trim() || site.title,
      brand: site.brand,
      brandSlug: null,
      website: site.href ?? null,
      video,
      poster: await sign(site.poster_url, SITE, "site-reels"),
      format: embedFormat(site.format),
    };
  });
