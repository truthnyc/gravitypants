import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { CATEGORIES, normalizeCategory } from "@/lib/directory/directory";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
const log = (db: any, admin: string, action: string, target: string) =>
  db.from("admin_audit_log").insert({ admin_user_id: admin, action, workspace_id: null, target });

export type AdminReel = {
  id: string; brand: string; title: string; href: string | null; category: string; format: string;
  seconds: number; photos: number; video_url: string; video_webm_url: string | null; poster_url: string | null;
  sort_order: number; published: boolean; brand_id: string | null; posterView: string | null; videoView: string | null;
};

export const listAdminReels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminReel[]> => {
    const db = await adminDb(context);
    const { data } = await db.from("site_reels").select("*").order("sort_order").order("created_at");
    const rows = (data ?? []) as any[];
    const paths = rows.flatMap((r) => [r.poster_url, r.video_url]).filter((u: string | null) => u?.startsWith("site-reels:")).map((u: string) => u.slice(11));
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: s } = await db.storage.from("site-reels").createSignedUrls(paths, 3600);
      for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
    }
    return rows.map((r) => ({
      ...r,
      seconds: Number(r.seconds),
      videoView: r.video_url?.startsWith("site-reels:") ? signed.get(r.video_url.slice(11)) ?? null : r.video_url,
      posterView: r.poster_url?.startsWith("site-reels:") ? signed.get(r.poster_url.slice(11)) ?? null : r.poster_url,
    }));
  });

const fileRef = z.string().max(1000).refine((u) => u.startsWith("site-reels:") || u.startsWith("/") || u.startsWith("https://"), "Bad file");
const reelSchema = z.object({
  id: z.string().uuid().optional(),
  brand: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  href: z.string().trim().url().max(500).nullable(),
  category: z.preprocess((c) => typeof c === "string" ? normalizeCategory(c) ?? c : c, z.enum(CATEGORIES)),
  format: z.enum(["916", "11", "169"]),
  seconds: z.number().min(0.5).max(600),
  photos: z.number().int().min(1).max(50),
  video_url: fileRef.optional(),
  poster_url: fileRef.nullable().optional(),
  published: z.boolean(),
  brand_id: z.string().uuid().nullable().optional(),
});

export const saveSiteReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reelSchema.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { id, ...fields } = data;
    const row: Record<string, unknown> = { ...fields };
    if (fields.video_url) row["video_webm_url"] = null; // a new upload replaces both old files
    if (fields.video_url === undefined) delete row["video_url"];
    if (fields.poster_url === undefined) delete row["poster_url"];
    if (id) {
      const { error } = await db.from("site_reels").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      await log(db, context.userId, "site_reel.update", `${data.brand} — ${data.title}`);
      return { id };
    }
    if (!fields.video_url) throw new Error("Add a reel file.");
    const { data: max } = await db.from("site_reels").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: ins, error } = await db.from("site_reels").insert({ ...row, sort_order: (max?.sort_order ?? 0) + 10 }).select("id").single();
    if (error) throw new Error(error.message);
    await log(db, context.userId, "site_reel.create", `${data.brand} — ${data.title}`);
    return { id: ins.id as string };
  });

export const deleteSiteReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: r } = await db.from("site_reels").select("*").eq("id", data.id).maybeSingle();
    if (!r) return { ok: true };
    await db.from("site_reels").delete().eq("id", data.id);
    const files = [r.video_url, r.video_webm_url, r.poster_url].filter((u: string | null) => u?.startsWith("site-reels:")).map((u: string) => u.slice(11));
    if (files.length) await db.storage.from("site-reels").remove(files);
    await log(db, context.userId, "site_reel.delete", `${r.brand} — ${r.title}`);
    return { ok: true };
  });

export const moveSiteReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    await Promise.all(data.ids.map((id, i) => db.from("site_reels").update({ sort_order: (i + 1) * 10 }).eq("id", id)));
    await log(db, context.userId, "site_reel.reorder", `${data.ids.length} reels`);
    return { ok: true };
  });
