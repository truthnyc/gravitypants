import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX, CATEGORIES, GRACE_DAYS, MOODS, REEL_DESCRIPTION_MAX, SLUG_MAX,
  WORDING_VERSION, permissionWording, toSlug, validFullName,
  type DirStatus, type DirectoryCard, type PlanTag, type ShareBrand,
} from "./directory";

/* eslint-disable @typescript-eslint/no-explicit-any */
const POSTER_PREFIX = "media:";

async function signPosters<T extends { poster_url: string | null }>(rows: T[]): Promise<(T & { poster: string | null })[]> {
  const paths = rows.map((r) => r.poster_url).filter((p): p is string => !!p && p.startsWith(POSTER_PREFIX)).map((p) => p.slice(POSTER_PREFIX.length));
  const m = new Map<string, string>();
  if (paths.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("media").createSignedUrls(paths, 60 * 60 * 24);
    for (const x of data ?? []) if (x.path && x.signedUrl) m.set(x.path, x.signedUrl);
  }
  return rows.map((r) => ({ ...r, poster: r.poster_url?.startsWith(POSTER_PREFIX) ? m.get(r.poster_url.slice(POSTER_PREFIX.length)) ?? null : r.poster_url }));
}

const LOGO_PREFIX = "brand-assets:";
async function signLogo(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith(LOGO_PREFIX)) return url.startsWith("https://") ? url : null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("brand-assets").createSignedUrl(url.slice(LOGO_PREFIX.length), 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

/** Brand members upload (or remove) the logo shown on their Directory brand page. */
export const setBrandLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    brandId: z.string().uuid(),
    file: z.object({ base64: z.string().max(3_000_000), type: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]) }).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: b } = await sb.from("directory_brands").select("id, workspace_id").eq("id", data.brandId).maybeSingle();
    if (!b) throw new Error("This brand page isn't available");
    let logo: string | null = null;
    if (data.file) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" }[data.file.type];
      const path = `${b.workspace_id}/directory-logo-${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0));
      const { error } = await supabaseAdmin.storage.from("brand-assets").upload(path, bytes, { contentType: data.file.type });
      if (error) throw new Error("Couldn't upload the logo");
      logo = LOGO_PREFIX + path;
    }
    const { error } = await sb.from("directory_brands").update({ logo_url: logo }).eq("id", b.id);
    if (error) throw new Error("Couldn't save the logo");
    return { ok: true };
  });

async function planState(sb: any, ws: string, brandEnded: string | null): Promise<{ tag: PlanTag; endedAt: string | null }> {
  const { data: plan } = await sb.rpc("directory_effective_plan", { _ws: ws });
  if (plan) return { tag: String(plan).startsWith("business") ? "business" : "simple", endedAt: null };
  const { data: bill } = await sb.rpc("effective_billing", { _ws: ws });
  const end = brandEnded ?? (bill && bill.plan !== "trial" && bill.plan !== "none" ? (bill.current_period_end ?? bill.comp_until ?? null) : null);
  if (end && Date.now() - new Date(end).getTime() < GRACE_DAYS * 86_400_000) return { tag: "ended", endedAt: end };
  return { tag: "trial", endedAt: null };
}

/** Everything the Share step needs for one ad. */
export const getShareContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: ad } = await sb.from("projects").select("id, workspace_id, name, template_id, formats").eq("id", data.adId).maybeSingle();
    if (!ad) throw new Error("This ad isn't available");
    const { data: b } = await sb.from("directory_brands").select("*").eq("workspace_id", ad.workspace_id).maybeSingle();
    const { data: reel } = b ? await sb.from("directory_reels").select("id, status, tags, moods, title, description").eq("ad_id", ad.id).maybeSingle() : { data: null };
    const { data: last } = b && !reel ? await sb.from("directory_reels").select("tags, moods").eq("brand_id", b.id).order("updated_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
    const { data: kit } = await sb.from("brand_kits").select("name").eq("workspace_id", ad.workspace_id).order("is_default", { ascending: false }).limit(1).maybeSingle();
    const { data: ws } = await sb.from("workspaces").select("name").eq("id", ad.workspace_id).maybeSingle();
    const { data: member } = await sb.from("workspace_members").select("role").eq("workspace_id", ad.workspace_id).eq("user_id", context.userId).maybeSingle();
    const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", context.userId).maybeSingle();
    const plan = await planState(sb, ad.workspace_id, b?.plan_ended_at ?? null);
    const fallbackName = kit?.name ?? String(ws?.name ?? "").replace(/'s ads$/, "");
    const brand: ShareBrand = b
      ? { id: b.id, name: b.name, website_url: b.website_url ?? "", category: b.category, description: b.description ?? "", slug: b.slug, first_approved_at: b.first_approved_at }
      : { id: null, name: fallbackName, website_url: "", category: "Other", description: "", slug: toSlug(fallbackName || "brand"), first_approved_at: null };
    return {
      brand,
      reel: reel ? { id: reel.id as string, status: reel.status as DirStatus, tags: reel.tags as string[], moods: reel.moods as string[], title: (reel.title as string | null) ?? null, description: (reel.description as string | null) ?? "" } : null,
      prefill: { tags: (reel?.tags ?? last?.tags ?? []) as string[], moods: (reel?.moods ?? last?.moods ?? []) as string[] },
      plan,
      email: (context.claims as any)?.email ?? "",
      role: (member?.role as string | undefined) ?? "member",
      displayName: (profile?.display_name as string | null) ?? "",
    };
  });

async function uniqueSlug(sb: any, base: string) {
  for (let i = 0; i < 20; i++) {
    const suffix = `-${i + 1}`;
    const s = i ? `${base.slice(0, SLUG_MAX - suffix.length)}${suffix}` : base.slice(0, SLUG_MAX);
    const { data } = await sb.rpc("slug_status", { _slug: s, _brand: null });
    if (data === "available") return s;
  }
  return `${base.slice(0, 23)}-${crypto.randomUUID().slice(0, 6)}`;
}

const shareSchema = z.object({
  adId: z.string().uuid(),
  brand: z.object({
    name: z.string().trim().min(1).max(BRAND_NAME_MAX),
    website_url: z.string().trim().max(300),
    category: z.enum(CATEGORIES),
  }),
  description: z.string().trim().max(REEL_DESCRIPTION_MAX),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  moods: z.array(z.enum(MOODS)).max(3),
  show: z.boolean(),
  fullName: z.string().trim().max(120),
  jobTitle: z.string().trim().max(120),
  agreed: z.boolean(),
  posterPath: z.string().max(400).nullable(),
});

/** Saves the brand and the reel's listing; when shown, records the permission in the same request. */
export const shareReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shareSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: ad } = await sb.from("projects").select("id, workspace_id, name, template_id, formats").eq("id", data.adId).maybeSingle();
    if (!ad) throw new Error("This ad isn't available");
    const plan = await planState(sb, ad.workspace_id, null);
    if (plan.tag === "trial" || plan.tag === "ended") throw new Error("Sharing to the Directory is part of paid plans.");
    if (data.show && (!data.agreed || !validFullName(data.fullName))) throw new Error("Type your first and last name to give permission.");
    let website = data.brand.website_url;
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (website) { try { new URL(website); } catch { throw new Error("That website link doesn't look right."); } }

    let { data: brand } = await sb.from("directory_brands").select("id, name, first_approved_at").eq("workspace_id", ad.workspace_id).maybeSingle();
    const fields = { name: data.brand.name, website_url: website || null, category: data.brand.category };
    if (brand) {
      const { error } = await sb.from("directory_brands").update(fields).eq("id", brand.id);
      if (error) throw new Error(error.message);
    } else {
      const slug = await uniqueSlug(sb, toSlug(data.brand.name));
      const { data: created, error } = await sb.from("directory_brands").insert({ ...fields, workspace_id: ad.workspace_id, slug }).select("id, name, first_approved_at").single();
      if (error) throw new Error(error.message);
      brand = created;
    }
    const { data: prev } = await sb.from("directory_reels").select("id, status, title").eq("ad_id", ad.id).maybeSingle();
    const status: DirStatus = data.show ? (brand.first_approved_at ? "live" : "in_review") : prev?.status === "hidden" ? "hidden" : "private";
    const tags = [...new Set(data.tags.map((t) => t.toLowerCase()))];
    const { findLatestVideo } = await import("./directory.server");
    const videoUrl = await findLatestVideo(sb, ad.workspace_id, ad.id).catch(() => null);
    const row = {
      ad_id: ad.id, brand_id: brand.id, status, tags, moods: data.moods, template_id: ad.template_id, formats: (ad.formats as string[]).map((f) => f.replace(":", "x")),
      description: data.description || null,
      ...(prev?.title ? {} : { title: ad.name as string }),
      ...(data.posterPath ? { poster_url: `${POSTER_PREFIX}${data.posterPath}` } : {}),
      ...(videoUrl ? { video_url: videoUrl } : {}),
    };
    const { data: reel, error } = prev
      ? await sb.from("directory_reels").update(row).eq("id", prev.id).select("id, status").single()
      : await sb.from("directory_reels").insert(row).select("id, status").single();
    if (error) throw new Error(error.message);

    if (data.show) {
      const req = getRequest();
      const ip = req?.headers.get("cf-connecting-ip") ?? req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const { error: logErr } = await sb.from("permission_log").insert({
        directory_reel_id: reel.id, ad_id: ad.id, brand_id: brand.id, user_id: context.userId, action: "granted",
        full_name: data.fullName.trim(), job_title: data.jobTitle || null, wording_version: WORDING_VERSION,
        wording_text: permissionWording(data.brand.name), ip_address: ip, user_agent: req?.headers.get("user-agent")?.slice(0, 400) ?? null,
      });
      if (logErr) {
        // Never leave a reel public without a recorded permission.
        await sb.from("directory_reels").update({ status: prev?.status === "live" ? "live" : "private" }).eq("id", reel.id);
        throw new Error("Your permission couldn't be saved, so the reel wasn't shared. Try again.");
      }
    }
    return { status: reel.status as DirStatus };
  });

/** Hides a reel and records the withdrawal. */
export const hideReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: reel } = await sb.from("directory_reels").select("id, brand_id, ad_id").eq("ad_id", data.adId).maybeSingle();
    if (!reel) throw new Error("This reel isn't in the Directory.");
    const { data: lastGrant } = await sb.from("permission_log").select("full_name, job_title").eq("brand_id", reel.brand_id).eq("user_id", context.userId).eq("action", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", context.userId).maybeSingle();
    const { data: b } = await sb.from("directory_brands").select("name").eq("id", reel.brand_id).single();
    const email = (context.claims as any)?.email ?? "";
    const req = getRequest();
    const { error: logErr } = await sb.from("permission_log").insert({
      directory_reel_id: reel.id, ad_id: reel.ad_id, brand_id: reel.brand_id, user_id: context.userId, action: "withdrawn",
      full_name: lastGrant?.full_name ?? profile?.display_name ?? email, job_title: lastGrant?.job_title ?? null,
      wording_version: WORDING_VERSION, wording_text: `Withdrawn: ${permissionWording(b?.name ?? "")}`,
      ip_address: req?.headers.get("cf-connecting-ip") ?? null, user_agent: req?.headers.get("user-agent")?.slice(0, 400) ?? null,
    });
    if (logErr) throw new Error(logErr.message);
    const { error } = await sb.from("directory_reels").update({ status: "hidden", hidden_reason: "brand" }).eq("id", reel.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Directory status per ad for Your Ads. */
export const getAdStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: b } = await sb.from("directory_brands").select("id, plan_ended_at").eq("workspace_id", data.workspaceId).maybeSingle();
    if (!b) return { statuses: {} as Record<string, DirStatus>, liveUntil: null as string | null };
    const { data: reels } = await sb.from("directory_reels").select("ad_id, status").eq("brand_id", b.id);
    const plan = await planState(sb, data.workspaceId, b.plan_ended_at);
    const liveUntil = plan.tag === "ended" && plan.endedAt ? new Date(new Date(plan.endedAt).getTime() + GRACE_DAYS * 86_400_000).toISOString() : null;
    return { statuses: Object.fromEntries((reels ?? []).map((r: any) => [r.ad_id, r.status])) as Record<string, DirStatus>, liveUntil };
  });

/** Account → Directory: brand, its reels and the permission log. */
export const getDirectoryAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: b } = await sb.from("directory_brands").select("*").eq("workspace_id", data.workspaceId).maybeSingle();
    if (!b) return null;
    const { data: reels } = await sb.from("directory_reels").select("id, ad_id, status, updated_at, title, formats, poster_url, projects(name)").eq("brand_id", b.id).order("updated_at", { ascending: false });
    const { data: log } = await sb.from("permission_log").select("id, created_at, ad_id, action, full_name, job_title, email, wording_version, wording_text").eq("brand_id", b.id).order("created_at", { ascending: false }).limit(500);
    const names = new Map<string, string>((reels ?? []).map((r: any) => [r.ad_id, r.title ?? r.projects?.name ?? "Untitled"]));
    const { data: featured } = await sb.rpc("is_featured_brand", { _brand: b.id });
    const posterPaths = ((reels ?? []) as any[]).map((r) => r.poster_url as string | null).filter((p): p is string => !!p?.startsWith("media:")).map((p) => p.slice(6));
    const signedPosters = new Map<string, string>();
    if (posterPaths.length) {
      const bucket = sb.storage.from("media");
      const { data: sp } = await bucket.createSignedUrls(posterPaths, 3600);
      for (const x of sp ?? []) if (x.signedUrl && x.path) signedPosters.set(x.path, x.signedUrl);
    }
    return {
      brand: { id: b.id as string, name: b.name as string, slug: b.slug as string, description: (b.description ?? "") as string, logo: await signLogo(b.logo_url), website: (b.website_url ?? "") as string, category: (b.category ?? "Other") as string, featured: !!featured, planEndedAt: (b.plan_ended_at ?? null) as string | null },
      reels: ((reels ?? []) as any[]).map((r: any) => ({ adId: r.ad_id as string, name: (r.title as string | null) ?? r.projects?.name ?? "Untitled", status: r.status as DirStatus, updated: r.updated_at as string, size: ((r.formats ?? [])[0] ?? "").replace("x", ":") as string, thumb: r.poster_url?.startsWith("media:") ? signedPosters.get(r.poster_url.slice(6)) ?? null : null })),
      log: (log ?? []).map((l: any) => ({ ...l, reel: names.get(l.ad_id) ?? "Removed ad" })) as {
        id: string; created_at: string; reel: string; action: "granted" | "withdrawn"; full_name: string; job_title: string | null; email: string; wording_version: string; wording_text: string;
      }[],
    };
  });

/** Brands can edit the short description shown in their public page header. */
export const saveBrandDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    brandId: z.string().uuid(),
    description: z.string().trim().max(BRAND_DESCRIPTION_MAX),
    name: z.string().trim().min(1).max(50).optional(),
    website: z.string().trim().max(300).optional(),
    category: z.enum(CATEGORIES).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { description: data.description || null };
    if (data.name) patch.name = data.name;
    if (data.category) patch.category = data.category;
    if (data.website !== undefined) {
      let w = data.website;
      if (w && !/^https?:\/\//i.test(w)) w = `https://${w}`;
      if (w) { try { new URL(w); } catch { throw new Error("That website link doesn't look right."); } }
      patch.website_url = w || null;
    }
    const { error } = await (context.supabase as any).from("directory_brands")
      .update(patch)
      .eq("id", data.brandId);
    if (error) throw new Error("Couldn't save the brand description");
    return { ok: true };
  });

/** Brands can rename their own Directory reel (the title shown publicly). */
export const renameDirectoryReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid(), title: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: reel } = await sb.from("directory_reels").select("id").eq("ad_id", data.adId).maybeSingle();
    if (!reel) throw new Error("This reel isn't in the Directory yet.");
    const { error } = await sb.from("directory_reels").update({ title: data.title }).eq("id", reel.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(SLUG_MAX), brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: st } = await (context.supabase as any).rpc("slug_status", { _slug: data.slug, _brand: data.brandId });
    return st as "invalid" | "reserved" | "yours" | "taken" | "available";
  });

export const saveSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().regex(/^[a-z0-9-]{3,30}$/), brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: st } = await sb.rpc("slug_status", { _slug: data.slug, _brand: data.brandId });
    if (st !== "available") throw new Error(st === "yours" ? "That's already your address." : "That address is taken. Try another.");
    const { data: b } = await sb.from("directory_brands").select("slug").eq("id", data.brandId).single();
    const { error: hErr } = await sb.from("directory_slug_history").insert({ brand_id: data.brandId, old_slug: b.slug });
    if (hErr) throw new Error(hErr.message);
    const { error } = await sb.from("directory_brands").update({ slug: data.slug }).eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { slug: data.slug };
  });


/* ---------------- public */

export const searchDirectory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ q: z.string().max(200).default(""), size: z.enum(["9x16", "1x1", "16x9"]).nullable().default(null) }).parse(d))
  .handler(async ({ data }): Promise<DirectoryCard[]> => {
    const { publicClient } = await import("@/lib/site/reels.server");
    const { toCards } = await import("./directory.server");
    const { data: rows, error } = await (publicClient() as any).rpc("search_directory", { q: data.q, size: data.size });
    if (error) { console.error(error); return []; }
    return toCards(rows ?? []);
  });

export const getBrandPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/site/reels.server");
    const { toCards } = await import("./directory.server");
    const pc = publicClient() as any;
    const empty = { redirect: null as string | null, brand: null, reels: [] as DirectoryCard[], more: [] as { name: string; slug: string; poster: string | null }[] };
    const { data: b } = await pc.from("directory_brands").select("id, name, website_url, category, description, slug, logo_url").eq("slug", data.slug).maybeSingle();
    if (!b) {
      const { data: h } = await pc.from("directory_slug_history").select("brand_id").eq("old_slug", data.slug).order("changed_at", { ascending: false }).limit(1).maybeSingle();
      if (h) {
        const { data: nb } = await pc.from("directory_brands").select("slug").eq("id", h.brand_id).maybeSingle();
        if (nb) return { ...empty, redirect: nb.slug as string };
      }
      return empty;
    }
    const { data: reels } = await pc.from("directory_reels").select("id, tags, moods, formats, published_at, templates(name)").eq("brand_id", b.id).eq("status", "live").order("published_at", { ascending: false });
    if (!reels?.length) return empty;
    const { data: featured } = await pc.rpc("is_featured_brand", { _brand: b.id });
    const cards = await toCards(reels.map((r: any) => ({ id: r.id, brand_name: b.name, brand_slug: b.slug, category: b.category, tags: r.tags, moods: r.moods, formats: r.formats, template_name: r.templates?.name ?? null, featured })));
    const { data: similar } = await pc.rpc("search_directory", { q: "", size: null });
    const seen = new Set<string>([b.slug]);
    const moreRows = ((similar ?? []) as any[]).filter((r) => r.category === b.category && !seen.has(r.brand_slug) && seen.add(r.brand_slug)).slice(0, 12);
    const moreCards = await toCards(moreRows);
    return {
      redirect: null,
      brand: { id: b.id as string, name: b.name as string, website_url: b.website_url as string | null, category: b.category as string, description: b.description as string | null, slug: b.slug as string, logo_url: await signLogo(b.logo_url), featured: !!featured },
      reels: cards,
      more: moreCards.map((c) => ({ name: c.brand_name, slug: c.brand_slug, poster: c.poster })),
    };
  });

/** Public: report a live reel. */
export const reportReel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reelId: z.string().uuid(), reason: z.string().trim().min(1).max(500), email: z.string().trim().email().max(200).optional().or(z.literal("")) }).parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/site/reels.server");
    const { error } = await (publicClient() as any).from("directory_reports").insert({ directory_reel_id: data.reelId, reason: data.reason, reporter_email: data.email || null });
    if (error) throw new Error("That report couldn't be sent. Try again.");
    return { ok: true };
  });

/** "Make one like this": a new ad from the reel's template only, logged for analytics. */
export const makeOneLikeThis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reelId: z.string().uuid().nullable(), templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: t } = await sb.from("templates").select("id, name, slug").eq("id", data.templateId).maybeSingle();
    if (!t) throw new Error("This template isn't available anymore.");
    await sb.from("directory_make_events").insert({ directory_reel_id: data.reelId, template_id: t.id, user_id: context.userId });
    return { slug: t.slug as string | null, name: t.name as string, id: t.id as string };
  });

/* ---------------- admin review */

async function assertAdmin(sb: any) {
  const { data } = await sb.rpc("is_platform_admin");
  if (!data) throw new Error("Forbidden");
}

export const listDirectoryReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { data } = await sb.from("directory_reels").select("id, ad_id, brand_id, status, tags, moods, poster_url, updated_at, review_note, hidden_reason, title, description, directory_brands(name, slug, website_url, category, description, first_approved_at), projects(name)").order("updated_at", { ascending: false }).limit(300);
    const rows = await signPosters(data ?? []);
    const ids = rows.map((r: any) => r.id);
    const { data: logs } = ids.length ? await sb.from("permission_log").select("directory_reel_id, full_name, job_title, email, created_at, wording_version, action").in("directory_reel_id", ids).order("created_at", { ascending: false }) : { data: [] };
    const last = new Map<string, any>();
    for (const l of logs ?? []) if (!last.has(l.directory_reel_id)) last.set(l.directory_reel_id, l);
    const { data: reports } = await sb.from("directory_reports").select("id, directory_reel_id, reason, reporter_email, created_at").is("resolved_at", null).order("created_at", { ascending: false });
    return {
      reels: rows.map((r: any) => ({
        id: r.id as string, adId: r.ad_id as string, status: r.status as DirStatus, tags: r.tags as string[], moods: r.moods as string[], poster: r.poster as string | null,
        updated: r.updated_at as string, note: r.review_note as string | null, brand: r.directory_brands?.name as string, slug: r.directory_brands?.slug as string,
        website: r.directory_brands?.website_url as string | null, category: r.directory_brands?.category as string, description: r.directory_brands?.description as string | null,
        approved: !!r.directory_brands?.first_approved_at, ad: (r.title as string | null) ?? (r.projects?.name as string) ?? "Untitled",
        permission: (last.get(r.id) ?? null) as null | { full_name: string; job_title: string | null; email: string; created_at: string; wording_version: string; action: string },
      })),
      reports: ((reports ?? []) as any[]).map((x) => ({ id: x.id as string, reelId: x.directory_reel_id as string, reason: x.reason as string, email: x.reporter_email as string | null, created: x.created_at as string })),
    };
  });

export const reviewDirectoryReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "reject", "hide", "review", "edit"]),
    reason: z.string().trim().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    moods: z.array(z.enum(MOODS)).max(3).optional(),
    category: z.enum(CATEGORIES).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { data: reel } = await sb.from("directory_reels").select("id, brand_id").eq("id", data.id).single();
    const { brandOwnerEmail, sendDirectoryEmail, SITE } = await import("./directory.server");
    if (data.tags || data.moods) {
      const { error } = await sb.from("directory_reels").update({ ...(data.tags ? { tags: data.tags.map((t) => t.toLowerCase()) } : {}), ...(data.moods ? { moods: data.moods } : {}) }).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.category) await sb.from("directory_brands").update({ category: data.category }).eq("id", reel.brand_id);
    if (data.action === "edit") return { ok: true };
    const patch =
      data.action === "approve" ? { status: "live", review_note: null, hidden_reason: null }
      : data.action === "reject" ? { status: "private", review_note: data.reason || null }
      : data.action === "review" ? { status: "in_review" }
      : { status: "hidden", hidden_reason: "admin" };
    if (data.action === "reject" && !data.reason) throw new Error("Add a short reason.");
    if (data.action === "approve") await sb.from("directory_brands").update({ first_approved_at: new Date().toISOString() }).eq("id", reel.brand_id).is("first_approved_at", null);
    const { error } = await sb.from("directory_reels").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.action === "approve" || data.action === "reject") {
      const o = await brandOwnerEmail(reel.brand_id);
      if (o?.email) {
        const page = `${SITE}/directory/${o.slug}`;
        await sendDirectoryEmail(o.email, `dir-${data.action}-${data.id}-${Date.now()}`, data.action === "approve"
          ? { subject: "Your reel is live in the Directory", heading: "Your reel is live in the Directory", paragraphs: [`People can now find ${o.name}'s reel in Gravity Pants search and on your brand page. New reels you share from now on go live straight away.`], buttonLabel: "See your reel", buttonUrl: `${page}?reel=${data.id}`, secondaryLabel: "Open your brand page", secondaryUrl: page }
          : { subject: "Your reel wasn't added to the Directory", heading: "Your reel needs a change", paragraphs: [`We couldn't add ${o.name}'s reel to the Directory yet.`, `Reason: ${data.reason}`, "Make the change and share it again from the Share step."], buttonLabel: "Open Your Ads", buttonUrl: `${SITE}/app/ads` });
      }
    }
    return { ok: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { error } = await sb.from("directory_reports").update({ resolved_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list every Directory brand with its page address. */
export const listDirectoryBrands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { data, error } = await sb.from("directory_brands").select("id, name, slug, website_url, category, first_approved_at, workspaces(name)").order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((b) => ({
      id: b.id as string, name: b.name as string, slug: b.slug as string, website: b.website_url as string | null,
      category: b.category as string, approved: !!b.first_approved_at, workspace: b.workspaces?.name as string | null,
    }));
  });

/** Admin: change any brand's Directory address. Old address redirects for 12 months. */
export const adminSaveBrandSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().regex(/^[a-z0-9-]{3,30}$/), brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { data: st } = await sb.rpc("slug_status", { _slug: data.slug, _brand: data.brandId });
    if (st !== "available") throw new Error(st === "yours" ? "That's already this brand's address." : "That address is taken. Try another.");
    const { data: b } = await sb.from("directory_brands").select("slug").eq("id", data.brandId).single();
    const { error: hErr } = await sb.from("directory_slug_history").insert({ brand_id: data.brandId, old_slug: b.slug });
    if (hErr) throw new Error(hErr.message);
    const { error } = await sb.from("directory_brands").update({ slug: data.slug }).eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { slug: data.slug };
  });

/** Admin: full settings for one brand page and its reels. */
export const adminBrandDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { data: b, error } = await sb.from("directory_brands").select("id, name, slug, website_url, category, description, logo_url, first_approved_at, plan_ended_at, created_at").eq("id", data.brandId).single();
    if (error) throw new Error(error.message);
    const { data: reels } = await sb.from("directory_reels").select("id, ad_id, title, description, status, tags, moods, formats, poster_url, published_at, review_note, hidden_reason, projects(name)").eq("brand_id", b.id).order("created_at", { ascending: false });
    const signed = await signPosters((reels ?? []) as any[]);
    return {
      brand: { id: b.id as string, name: b.name as string, slug: b.slug as string, website: (b.website_url ?? "") as string, category: b.category as string, description: (b.description ?? "") as string, logo: await signLogo(b.logo_url), approved: b.first_approved_at as string | null, planEnded: b.plan_ended_at as string | null },
      reels: signed.map((r: any) => ({ id: r.id as string, title: (r.title ?? r.projects?.name ?? "Untitled") as string, description: (r.description ?? "") as string, ad: (r.projects?.name ?? "Removed ad") as string, status: r.status as DirStatus, tags: (r.tags ?? []) as string[], moods: (r.moods ?? []) as string[], formats: (r.formats ?? []) as string[], poster: r.poster as string | null, published: r.published_at as string | null, note: (r.review_note ?? r.hidden_reason ?? null) as string | null })),
    };
  });

/** Admin: edit a brand page's name, website, category and description. */
export const adminSaveBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    brandId: z.string().uuid(), name: z.string().trim().min(1).max(BRAND_NAME_MAX),
    website: z.string().trim().max(200).refine((v) => !v || /^https?:\/\//.test(v), "Website must start with http:// or https://"),
    category: z.enum(CATEGORIES), description: z.string().trim().max(BRAND_DESCRIPTION_MAX),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { error } = await sb.from("directory_brands").update({ name: data.name, website_url: data.website || null, category: data.category, description: data.description || null }).eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: rename any Directory reel's public title. */
export const adminRenameReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reelId: z.string().uuid(), title: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { error } = await sb.from("directory_reels").update({ title: data.title }).eq("id", data.reelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
