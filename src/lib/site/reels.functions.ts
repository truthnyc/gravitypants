import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { REEL_PREFIX, type SiteReel } from "./reels";

/** Public: published brand reels in order, with uploaded files turned into viewable links. */
export const listSiteReels = createServerFn({ method: "GET" }).handler(async (): Promise<SiteReel[]> => {
  const { publicClient } = await import("./reels.server");
  const db = publicClient();
  const { data, error } = await db
    .from("site_reels")
    .select("id, brand, title, href, category, format, seconds, photos, video_url, video_webm_url, poster_url")
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
    const { data: s } = await db.storage.from("site-reels").createSignedUrls(paths, 60 * 60 * 24 * 7);
    for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
  }
  const resolve = (u: string | null) => (u && u.startsWith(REEL_PREFIX) ? signed.get(u.slice(REEL_PREFIX.length)) ?? null : u);
  return data
    .map((r) => ({
      id: r.id,
      brand: r.brand,
      title: r.title,
      href: r.href,
      category: r.category as SiteReel["category"],
      format: r.format as SiteReel["format"],
      seconds: Number(r.seconds),
      photos: r.photos,
      video: resolve(r.video_url) ?? "",
      videoWebm: resolve(r.video_webm_url),
      poster: resolve(r.poster_url),
    }))
    .filter((r) => r.video);
});

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
    const { publicClient } = await import("./reels.server");
    const { error } = await publicClient().from("brand_requests").insert({
      name: data.name,
      email: data.email,
      brand: data.brand,
      website: data.website || null,
      message: data.message || null,
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
