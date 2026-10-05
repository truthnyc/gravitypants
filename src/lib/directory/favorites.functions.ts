import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RESERVED_SLUGS } from "./directory";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Public: like totals for reels and brands. */
export const getLikeCounts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }): Promise<Record<string, number>> => {
    if (!data.ids.length) return {};
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any).rpc("directory_like_counts", { _ids: data.ids });
    const out: Record<string, number> = {};
    for (const r of rows ?? []) out[r.target_id] = Number(r.likes);
    return out;
  });

/** Signed in: my favorites plus my sharing settings. */
export const getMyFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadFavorites } = await import("./favorites.server");
    const { data: page } = await (context.supabase as any).from("favorite_pages").select("slug, title, is_public").eq("user_id", context.userId).maybeSingle();
    const favs = await loadFavorites(context.userId);
    return { page: (page ?? null) as { slug: string; title: string | null; is_public: boolean } | null, ...favs };
  });

export const saveFavoritePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    slug: z.string().regex(/^[a-z0-9-]{3,30}$/, "Use 3 to 30 letters, numbers or hyphens"),
    title: z.string().max(60).nullable(),
    is_public: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (RESERVED_SLUGS.includes(data.slug)) throw new Error("That address is reserved. Try another.");
    const { error } = await (context.supabase as any).from("favorite_pages").upsert({ user_id: context.userId, slug: data.slug, title: data.title?.trim() || null, is_public: data.is_public });
    if (error) throw new Error(error.code === "23505" ? "That address is taken. Try another." : "Couldn't save. Try again.");
    return { ok: true };
  });

/** Public: a shared favorites page. Returns null when it doesn't exist or isn't shared. */
export const getPublicFavorites = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: page } = await (supabaseAdmin as any).from("favorite_pages").select("user_id, title, slug").eq("slug", data.slug).eq("is_public", true).maybeSingle();
    if (!page) return null;
    const { loadFavorites } = await import("./favorites.server");
    const favs = await loadFavorites(page.user_id);
    return { title: (page.title as string | null) ?? "Favorites", slug: page.slug as string, ...favs };
  });
