import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { directorySettingsSchema, mergeSettings, pickSchema, resolveFeatured, type DirectorySettings, type FeaturedPick } from "./settings";
import { searchDirectory, type FacetedReel } from "./directory.functions";
import { getDirectoryWeeklyViews } from "./views.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = "directory";

async function readAll(sb: any): Promise<{ settings: DirectorySettings; picks: FeaturedPick[] }> {
  const [{ data: row }, { data: picks }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", KEY).maybeSingle(),
    sb.from("directory_featured_reels").select("reel_id, kind, week_of, position").order("position"),
  ]);
  return {
    settings: mergeSettings(row?.value),
    picks: ((picks ?? []) as any[]).map((p) => ({ reelId: p.reel_id, kind: p.kind, week: p.week_of })),
  };
}

/** Public: settings plus the resolved featured reels for the Directory page. */
export const getDirectoryPublic = createServerFn({ method: "GET" }).handler(async (): Promise<{ settings: DirectorySettings; featured: FacetedReel[] }> => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { settings, picks } = await readAll(publicClient());
  if (!settings.showCarousel) return { settings, featured: [] };
  const pool = (await searchDirectory({ data: { pageSize: 240 } })).reels;
  let saves: Record<string, number> = {};
  if (settings.rule === "saved" && settings.source === "auto") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).rpc("directory_reel_save_counts", { _ids: pool.map((r) => r.id) });
    saves = Object.fromEntries(((data ?? []) as any[]).map((r) => [r.reel_id, Number(r.saves)]));
  }
  const views = settings.rule === "viewed"
    ? await getDirectoryWeeklyViews({ data: { ids: pool.map((r) => r.id) } }) : {};
  return { settings, featured: resolveFeatured(settings, picks, pool, new Date(), saves, views) };
});

async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getDirectorySettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readAll(await adminDb(context)));

export const saveDirectorySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ value: directorySettingsSchema.nullable(), picks: z.array(pickSchema).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { error } = data.value
      ? await db.from("site_settings").upsert({ key: KEY, value: data.value, updated_at: new Date().toISOString(), updated_by: context.userId })
      : await db.from("site_settings").delete().eq("key", KEY);
    if (error) throw new Error(error.message);
    const { error: delErr } = await db.from("directory_featured_reels").delete().not("id", "is", null);
    if (delErr) throw new Error(delErr.message);
    const picks = data.value ? data.picks : [];
    if (picks.length) {
      const { error: insErr } = await db.from("directory_featured_reels").insert(picks.map((p, i) => ({ reel_id: p.reelId, kind: p.kind, week_of: p.week, position: i })));
      if (insErr) throw new Error(insErr.message);
    }
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.value ? "directory_settings.update" : "directory_settings.reset", workspace_id: null, target: data.value ? `${picks.length} featured picks` : "directory_settings" });
    return { ok: true };
  });
