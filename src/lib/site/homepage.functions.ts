import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_CONTENT, type HomepageContent, type SitePhoto } from "./homepage";
import { REEL_PREFIX } from "./reels";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function sign(content: HomepageContent): Promise<HomepageContent> {
  const all = [...content.hero.photos, ...content.example.photos, ...(content.quote.photo ? [content.quote.photo] : [])];
  const paths = all.filter((p) => p.ref.startsWith(REEL_PREFIX)).map((p) => p.ref.slice(REEL_PREFIX.length));
  if (!paths.length) return content;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("site-reels").createSignedUrls(paths, 60 * 60 * 24 * 7);
  const m = new Map<string, string>();
  for (const x of data ?? []) if (x.path && x.signedUrl) m.set(x.path, x.signedUrl);
  const fix = (ps: SitePhoto[]) => ps.map((p) => (p.ref.startsWith(REEL_PREFIX) ? { ...p, src: m.get(p.ref.slice(REEL_PREFIX.length)) ?? "" } : p)).filter((p) => p.src !== "");
  const fixOne = (p: SitePhoto | null) => (p ? fix([p])[0] ?? null : null);
  return { hero: { ...content.hero, photos: fix(content.hero.photos) }, example: { ...content.example, photos: fix(content.example.photos) }, quote: { ...content.quote, photo: fixOne(content.quote.photo) } };
}

function merge(rows: { key: string; value: any }[] | null): HomepageContent {
  const get = (k: string) => rows?.find((r) => r.key === k)?.value ?? {};
  const hero = { ...DEFAULT_CONTENT.hero, ...get("home_hero") };
  const example = { ...DEFAULT_CONTENT.example, ...get("example_of_week") };
  const quote = { ...DEFAULT_CONTENT.quote, ...get("home_quote") };
  if (!hero.photos?.length) hero.photos = DEFAULT_CONTENT.hero.photos;
  if (!example.photos?.length) example.photos = DEFAULT_CONTENT.example.photos;
  return { hero, example, quote };
}

/** Public: home banner + Example of the week, falling back to the bundled Purl Soho content. */
export const getHomepageContent = createServerFn({ method: "GET" }).handler(async (): Promise<HomepageContent> => {
  try {
    const { publicClient } = await import("./reels.server");
    const { data } = await publicClient().from("site_settings").select("key, value");
    return await sign(merge(data as any));
  } catch {
    return DEFAULT_CONTENT;
  }
});

async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Admin: raw saved content (with viewable photo links) for the editor. */
export const getHomepageAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomepageContent> => {
    const db = await adminDb(context);
    const { data } = await db.from("site_settings").select("key, value");
    return sign(merge(data));
  });

const s = (max: number) => z.string().trim().max(max);
const photo = z.object({
  ref: z.string().max(1000).refine((u) => u.startsWith(REEL_PREFIX) || u.startsWith("/") || u.startsWith("https://"), "Bad file"),
  alt: s(200),
});
const heroSchema = z.object({
  announcement: s(120), announcementLink: s(60), line1: s(60).min(1), line2: s(60), lede: s(400), primary: s(40).min(1),
  secondary: s(40).min(1), note: s(200), reelId: z.string().uuid().nullable(), photos: z.array(photo).length(3),
});
const exampleSchema = z.object({ reelId: z.string().uuid().nullable(), title: s(120).min(1), description: s(400), photos: z.array(photo).min(1).max(3) });
const quoteSchema = z.object({ quote: s(400).min(1), name: s(80), role: s(120), photo: photo.nullable() });
const saveSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("home_hero"), value: heroSchema.nullable() }),
  z.object({ key: z.literal("example_of_week"), value: exampleSchema.nullable() }),
  z.object({ key: z.literal("home_quote"), value: quoteSchema.nullable() }),
]);

/** Admin: save a section (value null = reset to default). */
export const saveHomepageSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { error } = data.value
      ? await db.from("site_settings").upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString(), updated_by: context.userId })
      : await db.from("site_settings").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.value ? `homepage.${data.key}.update` : `homepage.${data.key}.reset`, workspace_id: null, target: data.key });
    return { ok: true };
  });
