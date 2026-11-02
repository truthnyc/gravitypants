import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

/** Staff only: re-checks the role server-side before using the service-role client. */
async function adminDb(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
const log = (db: any, admin: string, action: string, ws: string | null, target: string | null) =>
  db.from("admin_audit_log").insert({ admin_user_id: admin, action, workspace_id: ws, target });

const EDITORIAL = (name: string) => `Editorial · ${name}`;
const bucketOf = (p: string) => (p.startsWith("brand-assets:") ? { bucket: "brand-assets", key: p.slice(13) } : { bucket: "media", key: p });

/** Every stored file path under the source workspace that appears in a JSON value. */
function pathsIn(json: string, ws: string) {
  const re = new RegExp(`(?:brand-assets:)?${ws}/[^"\\s]+`, "g");
  return [...new Set(json.match(re) ?? [])];
}
const swap = <T,>(v: T, from: string, to: string): T => JSON.parse(JSON.stringify(v ?? null).split(`${from}/`).join(`${to}/`));

/** Staff "Publish to Gravity Pants": copies an ad (frames, files, brand kit) into its brand's own editorial workspace. The client's ad is untouched. */
export const adminPublishAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), brandId: z.string().uuid().nullable(), brandName: z.string().trim().max(80).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { data: p, error } = await db.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !p) throw new Error("That ad couldn't be found.");
    let name = data.brandName ?? "";
    if (data.brandId) {
      const { data: b } = await db.from("directory_brands").select("name").eq("id", data.brandId).single();
      name = b?.name ?? "";
    }
    if (!name) throw new Error("Choose a brand first.");

    let { data: ws } = await db.from("workspaces").select("id").is("owner_id", null).eq("name", EDITORIAL(name)).maybeSingle();
    if (!ws) {
      const r = await db.from("workspaces").insert({ name: EDITORIAL(name), owner_id: null }).select("id").single();
      if (r.error) throw new Error("Couldn't create the brand's workspace.");
      ws = r.data;
    }
    const src = p.workspace_id as string, dst = ws.id as string;
    if (src === dst) throw new Error("This ad is already in its Gravity Pants workspace.");

    const { data: frames } = await db.from("frames").select("*").eq("project_id", p.id).order("sort_order");
    let kit: any = null;
    if (p.brand_kit_id) kit = (await db.from("brand_kits").select("*").eq("id", p.brand_kit_id).maybeSingle()).data;
    if (!kit) kit = (await db.from("brand_kits").select("*").eq("workspace_id", src).eq("is_default", true).maybeSingle()).data;

    // Copy every file the ad uses.
    const all = JSON.stringify([p.logo, p.end_card, p.thumbnail_url, frames, kit?.logo_url, kit?.logo_dark_url]);
    let failed = 0;
    for (const path of pathsIn(all, src)) {
      const { bucket, key } = bucketOf(path);
      const { error: e } = await db.storage.from(bucket).copy(key, key.replace(`${src}/`, `${dst}/`));
      if (e && !/exists/i.test(e.message)) failed++;
    }

    let kitId: string | null = null;
    if (kit) {
      const { count } = await db.from("brand_kits").select("id", { count: "exact", head: true }).eq("workspace_id", dst);
      const { id: _i, workspace_id: _w, created_at: _c, updated_at: _u, ...rest } = kit;
      const r = await db.from("brand_kits").insert({ ...swap(rest, src, dst), workspace_id: dst, is_default: !count, created_by: (context as Ctx).userId }).select("id").single();
      kitId = r.data?.id ?? null;
    }

    const { id: _pid, workspace_id: _pw, created_at: _pc, updated_at: _pu, deleted_at: _pd, ...prest } = p;
    const copy = await db.from("projects").insert({ ...swap(prest, src, dst), workspace_id: dst, brand_kit_id: kitId, template_id: null, created_by: (context as Ctx).userId }).select("id").single();
    if (copy.error) throw new Error("Couldn't copy the ad.");
    const rows = (frames ?? []).map(({ id: _f, project_id: _fp, created_at: _fc, updated_at: _fu, ...f }: any) => {
      const r = swap(f, src, dst);
      if (r.photo) r.photo.asset_id = null;
      return { ...r, project_id: copy.data.id };
    });
    if (rows.length) {
      const fr = await db.from("frames").insert(rows);
      if (fr.error) { await db.from("projects").delete().eq("id", copy.data.id); throw new Error("Couldn't copy the ad's frames."); }
    }
    await log(db, (context as Ctx).userId, "ad.publish_copy", dst, `${p.id} -> ${copy.data.id}`);
    return { projectId: copy.data.id as string, workspace: EDITORIAL(name), failedFiles: failed };
  });

async function signed(db: any, path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const { bucket, key } = bucketOf(path);
  const { data } = await db.storage.from(bucket).createSignedUrl(key, 3600);
  return (data?.signedUrl as string) ?? null;
}

export type PublishedItem = { projectId: string; name: string; brand: string; workspace: string; status: string; reelId: string | null; title: string | null; description: string | null; thumb: string | null; updatedAt: string };

/** Every published reel (Aimanté live or in review, Showcase) plus ads copied into Gravity Pants editorial workspaces. */
export const adminPublishedList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const [{ data: reels }, { data: eds }] = await Promise.all([
      db.from("directory_reels").select("id, ad_id, status, in_showcase, display_title, title, description, poster_url, directory_brands(name)").or("status.in.(live,in_review),in_showcase.eq.true"),
      db.from("workspaces").select("id, name").is("owner_id", null).like("name", "Editorial · %"),
    ]);
    const edIds = (eds ?? []).map((w: any) => w.id);
    const reelAds = (reels ?? []).map((r: any) => r.ad_id);
    const { data: projects } = await db.from("projects").select("id, name, workspace_id, thumbnail_url, updated_at, workspaces(name)").is("deleted_at", null)
      .or([reelAds.length ? `id.in.(${reelAds.join(",")})` : "", edIds.length ? `workspace_id.in.(${edIds.join(",")})` : ""].filter(Boolean).join(",") || "id.is.null");
    const byAd = new Map((reels ?? []).map((r: any) => [r.ad_id, r]));
    const out: PublishedItem[] = [];
    for (const p of projects ?? []) {
      const r: any = byAd.get(p.id);
      const wsName = p.workspaces?.name ?? "";
      out.push({
        projectId: p.id, name: p.name, workspace: wsName,
        brand: r?.directory_brands?.name ?? wsName.replace(/^Editorial · /, ""),
        status: r ? (r.in_showcase ? "Showcase" : r.status === "live" ? "Live on Aimanté" : "In review") : "Gravity Pants copy",
        reelId: r?.id ?? null, title: r ? (r.display_title ?? r.title) : null, description: r?.description ?? null,
        thumb: await signed(db, r?.poster_url ?? p.thumbnail_url), updatedAt: p.updated_at,
      });
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

/** One ad's frames and brand kit for quick editing. */
export const adminPublishedDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { data: p } = await db.from("projects").select("id, workspace_id, brand_kit_id").eq("id", data.projectId).single();
    const { data: frames } = await db.from("frames").select("id, sort_order, photo, headline, subline").eq("project_id", data.projectId).order("sort_order");
    let kit: any = null;
    if (p?.brand_kit_id) kit = (await db.from("brand_kits").select("id, name, colors, headline_font, subline_font, logo_url, logo_dark_url, workspace_id").eq("id", p.brand_kit_id).maybeSingle()).data;
    const kitUsers = kit ? (await db.from("projects").select("id", { count: "exact", head: true }).eq("brand_kit_id", kit.id).is("deleted_at", null)).count ?? 1 : 0;
    return {
      frames: await Promise.all((frames ?? []).map(async (f: any) => ({
        id: f.id as string, n: f.sort_order as number, photo: await signed(db, f.photo?.path ?? f.photo?.url),
        headline: (f.headline?.text ?? null) as string | null, subline: (f.subline?.text ?? null) as string | null,
      }))),
      kit: kit ? { id: kit.id as string, name: kit.name as string, colors: (kit.colors ?? []) as string[], headline_font: kit.headline_font as string | null, subline_font: kit.subline_font as string | null, logo: await signed(db, kit.logo_url), logoDark: await signed(db, kit.logo_dark_url), sharedWith: kitUsers } : null,
    };
  });

/** Saves title, description and the words on each frame. Reels already rendered keep their old video until re-exported. */
export const adminPublishedSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(), reelId: z.string().uuid().nullable(),
    title: z.string().trim().max(120).nullable(), description: z.string().trim().max(300).nullable(),
    frames: z.array(z.object({ id: z.string().uuid(), headline: z.string().max(200).nullable(), subline: z.string().max(300).nullable() })).max(40),
    kit: z.object({ id: z.string().uuid(), colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(12), headline_font: z.string().max(80).nullable(), subline_font: z.string().max(80).nullable() }).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    if (data.reelId) await db.from("directory_reels").update({ display_title: data.title || null, description: data.description || null }).eq("id", data.reelId).eq("ad_id", data.projectId);
    const { data: frames } = await db.from("frames").select("id, headline, subline").eq("project_id", data.projectId);
    const own = new Map((frames ?? []).map((f: any) => [f.id, f]));
    for (const f of data.frames) {
      const cur: any = own.get(f.id);
      if (!cur) continue;
      const patch: Record<string, unknown> = {};
      if (cur.headline && f.headline !== null && f.headline !== cur.headline.text) patch.headline = { ...cur.headline, text: f.headline };
      if (cur.subline && f.subline !== null && f.subline !== cur.subline.text) patch.subline = { ...cur.subline, text: f.subline };
      if (Object.keys(patch).length) await db.from("frames").update(patch).eq("id", f.id);
    }
    if (data.kit) {
      const { data: p } = await db.from("projects").select("brand_kit_id").eq("id", data.projectId).single();
      if (p?.brand_kit_id === data.kit.id) await db.from("brand_kits").update({ colors: data.kit.colors, headline_font: data.kit.headline_font || null, subline_font: data.kit.subline_font || null }).eq("id", data.kit.id);
    }
    await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", data.projectId);
    await log(db, (context as Ctx).userId, "published.edit", null, data.projectId);
    return { ok: true };
  });

const uploadInput = z.object({ projectId: z.string().uuid(), target: z.enum(["photo", "logo", "logo_dark"]), frameId: z.string().uuid().nullable(), fileName: z.string().max(200), contentType: z.string().regex(/^image\/(png|jpeg|webp|svg\+xml)$/) });

/** Signed one-time upload slot inside the ad's own workspace folder. */
export const adminPublishedUploadSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { data: p } = await db.from("projects").select("workspace_id").eq("id", data.projectId).single();
    if (!p) throw new Error("Ad not found.");
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const bucket = data.target === "photo" ? "media" : "brand-assets";
    const key = `${p.workspace_id}/${data.target === "photo" ? "photo" : "logos"}/${crypto.randomUUID()}-${safe}`;
    const { data: slot, error } = await db.storage.from(bucket).createSignedUploadUrl(key);
    if (error) throw new Error("Couldn't prepare the upload.");
    return { bucket, path: key, token: slot.token as string };
  });

/** Points a frame photo or the ad's brand-kit logo at a file just uploaded through a slot. */
export const adminPublishedUseFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadInput.omit({ contentType: true }).extend({ path: z.string().max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { data: p } = await db.from("projects").select("workspace_id, brand_kit_id").eq("id", data.projectId).single();
    if (!p || !data.path.startsWith(`${p.workspace_id}/`)) throw new Error("That file doesn't belong to this ad.");
    if (data.target === "photo") {
      const { data: f } = await db.from("frames").select("photo").eq("id", data.frameId).eq("project_id", data.projectId).single();
      if (!f) throw new Error("Frame not found.");
      await db.from("frames").update({ photo: { ...f.photo, path: data.path, url: data.path, asset_id: null, name: data.fileName } }).eq("id", data.frameId);
    } else {
      if (!p.brand_kit_id) throw new Error("This ad has no brand kit.");
      await db.from("brand_kits").update({ [data.target === "logo" ? "logo_url" : "logo_dark_url"]: `brand-assets:${data.path}` }).eq("id", p.brand_kit_id);
    }
    await log(db, (context as Ctx).userId, `published.${data.target}`, p.workspace_id, data.projectId);
    return { ok: true };
  });
