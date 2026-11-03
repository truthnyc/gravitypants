/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guideInput, type GuideSection } from "./guides";

/** Public: every published guide (for /guides, listing pages, homepage banner and sitemap). */
export const listGuides = createServerFn({ method: "GET" }).handler(async () => {
  const { publishedGuides, withCovers } = await import("./guides.server");
  return (await withCovers(await publishedGuides())).map(({ firstBrand: _f, ...g }) => g);
});

/** Public: one published guide with server-resolved brand cards and related guides. */
export const getGuide = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().toLowerCase().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/site/reels.server");
    const { brandThumbs, publishedGuides, withCovers } = await import("./guides.server");
    const pc = publicClient() as any;
    const { data: g } = await pc.from("guides").select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!g) return null;
    const sections = (g.sections ?? []) as GuideSection[];
    const ids = [...new Set(sections.flatMap((s) => s.brands.map((b) => b.id)))];
    const { data: brands } = ids.length ? await pc.from("directory_brands").select("id, name, slug, category, logo_url").in("id", ids).eq("status", "live") : { data: [] };
    const thumbs = await brandThumbs((brands ?? []) as any[]);
    const byId = new Map(((brands ?? []) as any[]).map((b) => [b.id as string, b]));
    const others = (await publishedGuides()).filter((o) => o.slug !== g.slug);
    const score = (o: { moods: string[]; categories: string[] }) => o.moods.filter((m) => (g.moods ?? []).includes(m)).length + o.categories.filter((c) => (g.categories ?? []).includes(c)).length;
    const related = (await withCovers([...others].sort((a, b) => score(b) - score(a)).slice(0, 3))).map(({ firstBrand: _f, ...o }) => o);
    return {
      slug: g.slug as string, title: g.title as string, seo_title: (g.seo_title as string) || (g.title as string), meta_description: g.meta_description as string,
      intro: g.intro as string, cover: (g.cover_image as string | null) ?? thumbs.get(sections[0]?.brands[0]?.id ?? "") ?? null,
      moods: (g.moods ?? []) as string[], season: g.season as string | null, season_label: g.season_label as string | null,
      start_date: g.start_date as string | null, end_date: g.end_date as string | null,
      published_at: (g.published_at ?? g.created_at) as string, updated_at: g.updated_at as string,
      sections: sections.map((s) => ({
        heading: s.heading, body: s.body,
        brands: s.brands.filter((b) => byId.has(b.id)).map((b) => { const x = byId.get(b.id); return { id: b.id, why: b.why, name: x.name as string, slug: x.slug as string, category: x.category as string, poster: thumbs.get(b.id) ?? null }; }),
      })),
      related,
    };
  });

async function adminDb(context: { supabase: any }) {
  const { data, error } = await context.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Error("Not authorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Staff: all guides, drafts included, plus the brand list for the picker. */
export const adminListGuides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context);
    const [{ data: guides, error }, { data: brands }] = await Promise.all([
      db.from("guides").select("*").order("updated_at", { ascending: false }),
      db.from("directory_brands").select("id, name, slug, status").eq("status", "live").order("name"),
    ]);
    if (error) throw new Error(error.message);
    return { guides: (guides ?? []) as any[], brands: (brands ?? []) as { id: string; name: string; slug: string }[] };
  });

export const adminSaveGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => guideInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { id, ...fields } = data;
    const row: any = { ...fields, season: fields.season || null, season_label: fields.season_label || null };
    if (fields.status === "published") {
      const { data: prev } = id ? await db.from("guides").select("published_at").eq("id", id).maybeSingle() : { data: null };
      if (!prev?.published_at) row.published_at = new Date().toISOString();
    }
    const res = id ? await db.from("guides").update(row).eq("id", id).select("id").single() : await db.from("guides").insert(row).select("id").single();
    if (res.error) throw new Error(res.error.code === "23505" ? "Another guide already uses that address." : res.error.message);
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: id ? "guide.update" : "guide.create", target: data.slug });
    return { id: res.data.id as string };
  });

export const adminDeleteGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: row, error } = await db.from("guides").delete().eq("id", data.id).select("slug").single();
    if (error) throw new Error(error.message);
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "guide.delete", target: row.slug });
    return { ok: true };
  });
