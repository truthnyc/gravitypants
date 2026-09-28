import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { settingsFromDoc, slugify, type TemplateDoc } from "./template-doc";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

/** Staff-only: checks is_platform_admin() as the caller before touching the service-role client. */
async function adminDb(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
const log = (db: any, admin: string, action: string, target: string) =>
  db.from("admin_audit_log").insert({ admin_user_id: admin, action, workspace_id: null, target });

/** Per-template history shown on the builder's History panel. */
const event = (db: any, templateId: string, userId: string, action: string, version: number | null) =>
  db.from("template_events").insert({ template_id: templateId, user_id: userId, action, version });

const slide = z.object({
  role: z.string().max(40),
  duration_sec: z.number().min(0.5).max(15),
  transition_in: z.enum(["none", "fade", "slide", "swipe-left", "zoom", "cut"]),
  text_animation: z.enum(["none", "rise-up", "fade-in", "typewriter", "zoom"]),
  photo_motion: z.enum(["none", "slow-zoom-in", "pan"]),
  headline_placeholder: z.string().max(120),
  subline_placeholder: z.string().max(160),
  sample_photo: z.string().max(300).nullable().optional(),
});
const docSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name.").max(60),
  slug: z.string().trim().max(60),
  description: z.string().max(120),
  format: z.enum(["9:16", "1:1", "16:9"]),
  is_reusable: z.boolean(),
  featured: z.boolean(),
  thumbnail_url: z.string().max(300).nullable(),
  style: z.object({
    background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Background must be a hex color like #1F2A22."),
    headline: z.object({ font: z.string().max(80).nullable(), weight: z.number().int().min(100).max(900), size_px: z.number().min(12).max(300), color: z.string().max(9) }),
    subline: z.object({ font: z.string().max(80).nullable(), weight: z.number().int().min(100).max(900).optional(), size_px: z.number().min(10).max(200), color: z.string().max(9) }),
    text_position: z.string().max(20),
    logo_position: z.string().max(20),
  }),
  slides: z.array(slide).min(1, "Add at least one slide.").max(10),
});

function live(doc: TemplateDoc) {
  const slug = slugify(doc.slug || doc.name);
  if (!slug) throw new Error("Add a slug.");
  return {
    name: doc.name,
    slug,
    description: doc.description,
    format: doc.format,
    is_reusable: doc.is_reusable,
    featured: doc.featured,
    thumbnail_url: doc.thumbnail_url,
    style: doc.style,
    slides: doc.slides,
    settings: settingsFromDoc(doc),
    updated_at: new Date().toISOString(),
  };
}
const friendly = (e: any) => {
  if (e?.code === "23505") return new Error("Another template already uses that slug.");
  return new Error(e?.message ?? "That didn't save.");
};

export const adminTemplateList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);
    const { data, error } = await db.from("templates").select("*").eq("source", "system").order("sort_order").order("created_at");
    if (error) throw friendly(error);
    return (data ?? []) as any[];
  });

export const adminTemplateGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { data: row } = await db.from("templates").select("*").eq("id", data.id).eq("source", "system").maybeSingle();
    if (!row) throw new Error("That template doesn't exist.");
    return row as any;
  });

export const adminTemplateCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: last } = await db.from("templates").select("sort_order").eq("source", "system").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const doc: TemplateDoc = {
      name: "Untitled template",
      slug: `untitled-${crypto.randomUUID().slice(0, 6)}`,
      description: "",
      format: "9:16",
      is_reusable: false,
      featured: false,
      thumbnail_url: null,
      style: { background_color: "#1D1D1F", headline: { font: null, weight: 700, size_px: 96, color: "#FFFFFF" }, subline: { font: null, size_px: 44, color: "#FFFFFF" }, text_position: "center", logo_position: "top-right" },
      slides: [1, 2, 3].map((n) => ({ role: ["Hook", "Detail", "Offer"][n - 1]!, duration_sec: 2.5, transition_in: n === 1 ? "none" : "fade", text_animation: "rise-up", photo_motion: "none", headline_placeholder: "Your headline", subline_placeholder: "A short line", sample_photo: null })),
    };
    const { data: row, error } = await db
      .from("templates")
      .insert({ ...live(doc), source: "system", workspace_id: null, created_by: null, updated_by: ctx.userId, visibility: "global", status: "draft", version: 0, sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error) throw friendly(error);
    await log(db, ctx.userId, "template_create", doc.slug);
    await event(db, row.id, ctx.userId, "created", 0);
    return { id: row.id as string };
  });

export const adminTemplateSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), doc: docSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: row } = await db.from("templates").select("status, version").eq("id", data.id).eq("source", "system").maybeSingle();
    if (!row) throw new Error("That template doesn't exist.");
    const doc = data.doc as TemplateDoc;
    // Published templates keep serving the live version; edits wait in `draft` until Publish.
    const patch = row.status === "published" ? { draft: { ...doc, slug: slugify(doc.slug || doc.name) }, updated_at: new Date().toISOString() } : { ...live(doc), draft: null };
    const { error } = await db.from("templates").update({ ...patch, updated_by: ctx.userId }).eq("id", data.id);
    if (error) throw friendly(error);
    await log(db, ctx.userId, "template_save_draft", doc.slug);
    await event(db, data.id, ctx.userId, "saved_draft", (row as any).version ?? null);
    return { ok: true };
  });

export const adminTemplatePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), doc: docSchema, audience: z.array(z.enum(["simple", "business", "team"])), newBadge: z.boolean(), featured: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: row } = await db.from("templates").select("version").eq("id", data.id).eq("source", "system").maybeSingle();
    if (!row) throw new Error("That template doesn't exist.");
    const doc = { ...(data.doc as TemplateDoc), featured: data.featured };
    const now = new Date();
    const { error } = await db
      .from("templates")
      .update({
        ...live(doc),
        draft: null,
        updated_by: ctx.userId,
        status: "published",
        version: (row.version ?? 0) + 1,
        published_at: now.toISOString(),
        audience: data.audience,
        new_until: data.newBadge ? new Date(now.getTime() + 14 * 86400000).toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw friendly(error);
    await log(db, ctx.userId, "template_publish", `${doc.slug} v${(row.version ?? 0) + 1}`);
    await event(db, data.id, ctx.userId, "published", (row.version ?? 0) + 1);
    return { ok: true };
  });

export const adminTemplateAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["duplicate", "publish", "unpublish", "archive", "restore", "feature", "unfeature", "delete"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: row } = await db.from("templates").select("*").eq("id", data.id).eq("source", "system").maybeSingle();
    if (!row) throw new Error("That template doesn't exist.");
    let result: { id?: string } = {};
    const by = { updated_by: ctx.userId, updated_at: new Date().toISOString() };
    if (data.action === "duplicate") {
      const { id: _id, created_at: _c, draft, ...rest } = row;
      const src = draft ? { ...rest, ...live(draft) } : rest;
      const { data: copy, error } = await db
        .from("templates")
        .insert({ ...src, ...by, name: `${src.name} copy`, slug: `${src.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, status: "draft", version: 0, featured: false, published_at: null, new_until: null, draft: null, sort_order: row.sort_order + 1 })
        .select("id")
        .single();
      if (error) throw friendly(error);
      result = { id: copy.id };
    } else if (data.action === "publish") {
      if (!(row.slides as unknown[] | null)?.length) throw new Error("Add at least one slide first.");
      const { error } = await db.from("templates").update({
        ...(row.draft ? live(row.draft) : {}), ...by, draft: null, status: "published",
        version: (row.version ?? 0) + 1, published_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (error) throw friendly(error);
    } else if (data.action === "delete") {
      if (row.status !== "draft" || row.published_at || (row.version ?? 0) > 0) throw new Error("Only drafts that were never published can be deleted. Archive it instead.");
      const { count } = await db.from("projects").select("id", { count: "exact", head: true }).eq("template_id", data.id);
      if ((count ?? 0) > 0) throw new Error("Ads were made from this template. Archive it instead.");
      await db.from("templates").delete().eq("id", data.id);
    } else {
      const patch =
        data.action === "unpublish" ? { status: "draft" }
        : data.action === "archive" ? { status: "archived", featured: false }
        : data.action === "restore" ? { status: "draft" }
        : { featured: data.action === "feature" };
      await db.from("templates").update({ ...patch, ...by }).eq("id", data.id);
    }
    await log(db, ctx.userId, `template_${data.action}`, row.slug);
    if (data.action !== "delete") await event(db, data.action === "duplicate" && result.id ? result.id : data.id, ctx.userId, data.action === "duplicate" ? "duplicated" : data.action, data.action === "publish" ? (row.version ?? 0) + 1 : row.version ?? null);
    return result;
  });

export const adminTemplateReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    await Promise.all(data.ids.map((id, i) => db.from("templates").update({ sort_order: i + 1 }).eq("id", id).eq("source", "system")));
    await log(db, ctx.userId, "template_reorder", `${data.ids.length} templates`);
    return { ok: true };
  });

/** Sample photos and card thumbnails for ready-made templates live under media/system/templates/<id>/. */
export const adminTemplateUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), dataUrl: z.string().max(12_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(data.dataUrl);
    if (!m) throw new Error("Choose a PNG, JPG or WebP image.");
    const bytes = Buffer.from(m[3]!, "base64");
    if (bytes.length > 8 * 1024 * 1024) throw new Error("That image is over 8 MB.");
    const ext = m[2] === "jpeg" ? "jpg" : m[2];
    const path = `system/templates/${data.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("media").upload(path, bytes, { contentType: m[1], upsert: false });
    if (error) throw new Error("That image couldn't be uploaded.");
    return { path };
  });

export const adminTemplateHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { data: rows } = await db.from("template_events").select("id, user_id, action, version, created_at").eq("template_id", data.id).order("created_at", { ascending: false }).limit(200);
    const ids = [...new Set(((rows ?? []) as any[]).map((r) => r.user_id).filter(Boolean))];
    const emails = new Map<string, string>();
    for (const id of ids) {
      const { data: u } = await db.auth.admin.getUserById(id);
      if (u?.user?.email) emails.set(id, u.user.email);
    }
    return ((rows ?? []) as any[]).map((r) => ({ id: r.id as string, action: r.action as string, version: r.version as number | null, at: r.created_at as string, who: emails.get(r.user_id) ?? "Staff" }));
  });
