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
  photo_focus: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
  photo_zoom: z.number().min(1).max(3).optional(),
  photo_background_color: z.string().max(9).nullable().optional(),
  transition_speed: z.enum(["smooth", "quick"]).optional(),
  headline_style: z.object({ font_family: z.string().max(80).nullable().optional(), font_weight: z.number().min(100).max(900).nullable().optional(), size_px: z.number().min(12).max(300).optional(), color: z.string().max(9).optional(), animation: z.enum(["none", "rise", "fade", "pop", "typewriter"]).optional(), position: z.string().max(20).optional(), keep_under_headline: z.boolean().optional() }).optional(),
  subline_style: z.object({ font_family: z.string().max(80).nullable().optional(), font_weight: z.number().min(100).max(900).nullable().optional(), size_px: z.number().min(10).max(200).optional(), color: z.string().max(9).optional(), animation: z.enum(["none", "rise", "fade", "pop", "typewriter"]).optional(), position: z.string().max(20).optional(), keep_under_headline: z.boolean().optional() }).nullable().optional(),
  logo_visible: z.boolean().optional(),
  logo_variant: z.enum(["auto", "light", "dark"]).nullable().optional(),
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
    logo_path: z.string().max(300).nullable().optional(),
    logo_size_pct: z.number().min(5).max(100).optional(),
    logo_opacity: z.enum(["solid", "soft"]).optional(),
    logo_show_on: z.enum(["all", "first_last", "selected"]).optional(),
    logo_version: z.enum(["auto", "light", "dark"]).optional(),
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
      style: { background_color: "#1D1D1F", headline: { font: null, weight: 700, size_px: 96, color: "#FFFFFF" }, subline: { font: null, size_px: 44, color: "#FFFFFF" }, text_position: "center", logo_position: "top-right", logo_path: null, logo_size_pct: 16, logo_opacity: "solid", logo_show_on: "all", logo_version: "auto" },
      slides: [1, 2, 3].map((n) => ({ role: ["Hook", "Detail", "Offer"][n - 1]!, duration_sec: 2.5, transition_in: n === 1 ? "none" : "fade", text_animation: "rise-up", photo_motion: "none", headline_placeholder: "Your headline", subline_placeholder: "A short line", sample_photo: null, photo_focus: { x: 0.5, y: 0.5 }, photo_zoom: 1, logo_visible: true, logo_variant: null })),
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

/** Staff: turn any ad into a new system template draft (structure + text as placeholders + first photos as samples). */
export const adminTemplateFromAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: p } = await db.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("That ad doesn't exist.");
    const { data: fr } = await db.from("frames").select("*").eq("project_id", p.id).order("sort_order");
    const frames = ((fr ?? []) as any[]).slice(0, 10);
    if (!frames.length) throw new Error("That ad has no slides yet.");
    const TR: Record<string, string> = { cut: "cut", fade: "fade", slide: "slide", wipe: "swipe-left", zoom: "zoom", dip_black: "fade" };
    const TA: Record<string, string> = { none: "none", rise: "rise-up", fade: "fade-in", typewriter: "typewriter", pop: "zoom" };
    const PM: Record<string, string> = { slow_zoom_in: "slow-zoom-in", pan_left: "pan", pan_right: "pan" };
    const hex = (c: any, d: string) => (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toUpperCase() : d);
    const h0 = frames.find((f) => f.headline)?.headline ?? {};
    const s0 = frames.find((f) => f.subline)?.subline ?? {};
    const format = (["9:16", "1:1", "16:9"].includes(p.primary_format) ? p.primary_format : "9:16") as TemplateDoc["format"];
    const baseName = `${p.name || "Untitled"} template`.slice(0, 60);
    const doc: TemplateDoc = {
      name: baseName,
      slug: `${slugify(baseName)}-${crypto.randomUUID().slice(0, 4)}`,
      description: "",
      format,
      is_reusable: false,
      featured: false,
      thumbnail_url: null,
      style: {
        background_color: hex(frames[0].photo?.background_color, "#1D1D1F"),
        headline: { font: h0.font_family ?? null, weight: Math.min(900, Math.max(100, Math.round((h0.font_weight ?? 700) / 100) * 100)), size_px: Math.min(300, Math.max(12, h0.size_px ?? 96)), color: hex(h0.color, "#FFFFFF") },
        subline: { font: s0.font_family ?? null, weight: Math.min(900, Math.max(100, Math.round((s0.font_weight ?? 500) / 100) * 100)), size_px: Math.min(200, Math.max(10, s0.size_px ?? 44)), color: hex(s0.color, "#FFFFFF") },
        text_position: String(h0.position ?? "center").slice(0, 20),
        logo_position: String(p.logo?.positions?.[format] ?? p.logo?.position ?? "top-right").slice(0, 20),
        logo_path: null,
        logo_size_pct: Math.min(100, Math.max(5, Number(p.logo?.size_pct ?? 16))),
        logo_opacity: p.logo?.opacity === "soft" ? "soft" : "solid",
        logo_show_on: p.logo?.show_on === "selected" || p.logo?.show_on === "first_last" ? p.logo.show_on : "all",
        logo_version: p.logo?.version === "light" || p.logo?.version === "dark" ? p.logo.version : "auto",
      },
      slides: frames.map((f, i) => ({
        role: `Slide ${i + 1}`,
        duration_sec: Math.min(10, Math.max(0.5, Math.round(Number(f.duration_sec) * 10) / 10)),
        transition_in: (i === 0 ? "none" : TR[f.transition_in?.type] ?? "fade") as any,
        text_animation: (TA[f.headline?.animation ?? "none"] ?? "none") as any,
        photo_motion: (PM[f.photo?.movement] ?? "none") as any,
        headline_placeholder: String(f.headline?.text ?? "").slice(0, 120),
        subline_placeholder: String(f.subline?.text ?? "").slice(0, 160),
        sample_photo: null,
        photo_focus: f.photo?.focus ?? { x: 0.5, y: 0.5 },
        photo_zoom: Math.min(3, Math.max(1, Number(f.photo?.zoom ?? 1))),
        photo_background_color: f.photo?.background_color ?? null,
        transition_speed: f.transition_in?.speed === "quick" ? "quick" : "smooth",
        headline_style: f.headline ? { font_family: f.headline.font_family ?? null, font_weight: f.headline.font_weight ?? null, size_px: f.headline.size_px, color: f.headline.color, animation: f.headline.animation, position: f.headline.position } : undefined,
        subline_style: f.subline ? { font_family: f.subline.font_family ?? null, font_weight: f.subline.font_weight ?? null, size_px: f.subline.size_px, color: f.subline.color, animation: f.subline.animation, position: f.subline.position, keep_under_headline: f.subline.keep_under_headline } : null,
        logo_visible: f.logo_visible !== false,
        logo_variant: f.logo_variant === "light" || f.logo_variant === "dark" || f.logo_variant === "auto" ? f.logo_variant : null,
      })),
    };
    const { data: last } = await db.from("templates").select("sort_order").eq("source", "system").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: row, error } = await db.from("templates")
      .insert({ ...live(doc), source: "system", workspace_id: null, created_by: null, updated_by: ctx.userId, visibility: "global", status: "draft", version: 0, sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id").single();
    if (error) throw friendly(error);
    // Copy the ad's photos into staff-owned template storage so the customer's files stay private.
    const slides = await Promise.all(doc.slides.map(async (s, i) => {
      const src = frames[i].photo?.path as string | undefined;
      if (!src || src.includes(":")) return s;
      const dest = `system/templates/${row.id}/${crypto.randomUUID()}.${(src.split(".").pop() || "jpg").slice(0, 5)}`;
      const { error: e } = await db.storage.from("media").copy(src, dest);
      return e ? s : { ...s, sample_photo: dest };
    }));
    let logoPath: string | null = null;
    const sourceLogo = p.logo?.path ?? p.logo?.light_path ?? p.logo?.dark_path;
    if (sourceLogo && typeof sourceLogo === "string") {
      const dest = `system/templates/${row.id}/logo-${crypto.randomUUID()}.${(sourceLogo.split(".").pop() || "png").slice(0, 5)}`;
      if (sourceLogo.startsWith("brand-assets:")) {
        const { data: logoFile } = await db.storage.from("brand-assets").download(sourceLogo.slice("brand-assets:".length));
        if (logoFile) {
          const { error: logoError } = await db.storage.from("media").upload(dest, logoFile, { contentType: logoFile.type || "image/png", upsert: false });
          if (!logoError) logoPath = dest;
        }
      } else {
        const { error: logoError } = await db.storage.from("media").copy(sourceLogo, dest);
        if (!logoError) logoPath = dest;
      }
    }
    await db.from("templates").update({ slides, style: { ...doc.style, logo_path: logoPath } }).eq("id", row.id);
    await log(db, ctx.userId, "template_from_ad", `${doc.slug} ← ad ${p.id}`);
    await event(db, row.id, ctx.userId, "created_from_ad", 0);
    return { id: row.id as string };
  });
