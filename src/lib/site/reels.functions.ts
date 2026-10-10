import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { REEL_PREFIX, type SiteReel } from "./reels";
import { directoryToSiteReel, mergeShowcase, showcaseEligible } from "./featured-reels";

/** Public: published brand reels in order, with uploaded files turned into viewable links. */
export const listSiteReels = createServerFn({ method: "GET" }).handler(async (): Promise<SiteReel[]> => {
  const { publicClient } = await import("./reels.server");
  const db = publicClient();
  const { data, error } = await db
    .from("site_reels")
    .select("id, brand, brand_id, sort_order, created_at, title, display_title, description, href, category, format, seconds, photos, video_url, video_webm_url, poster_url")
    .eq("published", true)
    .order("sort_order")
    .order("created_at");
  if (error || !data) return [];
  const paths = data
    .flatMap((r) => [r.video_url, r.video_webm_url, r.poster_url])
    .filter((u): u is string => !!u && u.startsWith(REEL_PREFIX))
    .map((u) => u.slice(REEL_PREFIX.length));
  const signed = new Map<string, string>();
  if (paths.length) {
    // Bucket is private with no public read; sign only paths of published rows, server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.storage.from("site-reels").createSignedUrls(paths, 60 * 60 * 24 * 7);
    for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
  }
  const resolve = (u: string | null) => (u && u.startsWith(REEL_PREFIX) ? signed.get(u.slice(REEL_PREFIX.length)) ?? null : u);
  const slugs = new Map<string, string>();
  const byId = new Map<string, string>();
  try {
    const { data: brands } = await db.from("directory_brands").select("id, name, slug");
    for (const b of brands ?? []) { slugs.set((b.name ?? "").toLowerCase(), b.slug as string); byId.set(b.id as string, b.slug as string); }
  } catch {
    // Directory is optional; fall back to the slugified brand name.
  }
  const studio = data
    .map((r) => ({ order: Number(r.sort_order), created: r.created_at as string, reel: {
      id: r.id,
      brand: r.brand,
      brandSlug: (r.brand_id ? byId.get(r.brand_id) : undefined) ?? slugs.get(r.brand.toLowerCase()) ?? null,
      title: r.title,
      displayTitle: (r as { display_title?: string | null }).display_title ?? null,
      description: r.description,
      href: r.href,
      category: r.category as SiteReel["category"],
      format: r.format as SiteReel["format"],
      seconds: Number(r.seconds),
      photos: r.photos,
      video: resolve(r.video_url) ?? "",
      videoWebm: resolve(r.video_webm_url),
      poster: resolve(r.poster_url),
      source: "studio" as const,
    } as SiteReel }))
    .filter((x) => x.reel.video);
  const client = await featuredDirectoryReels().catch((e) => { console.error("featured directory reels failed", e); return []; });
  return mergeShowcase(studio, client);
});

/** Live Directory reels staff featured on Showcase/Examples, limited to brands still visible (plan or grace). */
async function featuredDirectoryReels() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: rows } = await sb.from("directory_reels")
    .select("id, ad_id, brand_id, status, in_showcase, title, display_title, description, formats, video_url, poster_url, showcase_order, created_at, directory_brands(id, name, slug, category, website_url)")
    .eq("in_showcase", true).eq("status", "live");
  if (!rows?.length) return [];
  const visible = new Set<string>();
  for (const id of [...new Set<string>(rows.map((r: any) => r.brand_id))]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: ok } = await sb.rpc("brand_visible", { _brand: id });
    if (ok) visible.add(id);
  }
  const keep = rows.filter((r: any) => showcaseEligible(r, visible) && r.directory_brands); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!keep.length) return [];
  const adIds = keep.map((r: any) => r.ad_id); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: frames } = await sb.from("frames").select("project_id, duration_sec").in("project_id", adIds);
  const len = new Map<string, { sec: number; n: number }>();
  for (const f of frames ?? []) { const v = len.get(f.project_id) ?? { sec: 0, n: 0 }; v.sec += Number(f.duration_sec); v.n += 1; len.set(f.project_id, v); }
  const P = "media:";
  const paths = keep.flatMap((r: any) => [r.video_url, r.poster_url]).filter((p: string | null) => p?.startsWith(P)).map((p: string) => p.slice(P.length)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: s } = await sb.storage.from("media").createSignedUrls(paths, 60 * 60 * 24);
    for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
  }
  const res = (u: string | null) => (u?.startsWith(P) ? signed.get(u.slice(P.length)) ?? null : u);
  return keep.flatMap((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const l = len.get(r.ad_id) ?? { sec: 0, n: 0 };
    const reel = directoryToSiteReel({ ...r, brand: r.directory_brands, video: res(r.video_url), poster: res(r.poster_url), seconds: Math.round(l.sec * 10) / 10, photos: l.n });
    return reel ? [{ reel, order: Number(r.showcase_order ?? 0), created: r.created_at as string }] : [];
  });
}

const requestSchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(200),
  email: z.string().trim().email("Please enter a valid email.").max(320),
  brand: z.string().trim().min(1, "Please add your brand.").max(200),
  website: z.string().trim().max(500).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
  company: z.string().optional().default(""), // honeypot, left empty by people
});

/** Public: a brand asks for a reel. Saves the request and emails help@gravitypants.com. */
export const submitBrandRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    if (data.company) return { ok: true };
    const { allowBrandRequest } = await import('@/lib/directory/application-limit.server');
    if (!await allowBrandRequest()) return { error: 'Too many submissions. Please try again in an hour.' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from("brand_requests").insert({
      name: data.name,
      email: data.email,
      brand: data.brand,
      website: data.website || null,
      message: data.message || null,
      status: 'pending',
    });
    if (error) return { error: "We couldn't send your message. Please try again." };
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("brand-request", "help@gravitypants.com", {
        templateData: { name: data.name, email: data.email, brand: data.brand, website: data.website, message: data.message },
        idempotencyKey: `brand-request-${data.email}-${Date.now()}`,
        replyTo: data.email,
      });
    } catch (e) {
      console.error("brand request email failed", e); // request is saved
    }
    return { ok: true };
  });
