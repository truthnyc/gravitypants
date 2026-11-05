import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BRAND_MOODS_MAX } from "./directory";

const REEL_AI_MAX = 6;

/** Signed-in: suggest moods for a reel being shared. Membership is checked by reading the ad through RLS. */
export const suggestReelMoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    adId: z.string().uuid(), brand: z.string().trim().max(120), category: z.string().trim().max(80),
    title: z.string().trim().max(120).optional(), description: z.string().trim().max(600).optional(),
    tags: z.array(z.string().trim().max(40)).max(20).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ad } = await context.supabase.from("projects").select("id").eq("id", data.adId).maybeSingle();
    if (!ad) throw new Error("Not authorized");
    const { data: moods } = await context.supabase.from("moods").select("name");
    const catalog = (moods ?? []).map((m) => m.name.toLowerCase());
    const { pickMoods } = await import("./mood-tagging.server");
    try {
      return { moods: await pickMoods({ brand: data.brand, category: data.category, title: data.title ?? null, description: data.description ?? null, tags: data.tags }, catalog, { min: 2, max: REEL_AI_MAX }) };
    } catch {
      return { moods: [] as string[], error: "Couldn't suggest moods right now." };
    }
  });

/** Staff only: tag every published reel and fill each brand up to its mood limit. Adds moods, never removes them. */
export const autoTagAllMoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_platform_admin");
    if (isAdmin !== true) throw new Error("Not authorized");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { pickMoods } = await import("./mood-tagging.server");
    const { data: moodRows } = await db.from("moods").select("name");
    const catalog = (moodRows ?? []).map((m) => m.name.toLowerCase());
    const [{ data: brands }, { data: dReels }, { data: sReels }] = await Promise.all([
      db.from("directory_brands").select("id, name, category, description, moods"),
      db.from("directory_reels").select("id, brand_id, title, display_title, description, tags, moods").in("status", ["live", "in_review"]).limit(200),
      db.from("site_reels").select("id, brand_id, brand, title, display_title, description, category, moods").eq("published", true).limit(200),
    ]);
    const byId = new Map((brands ?? []).map((b) => [b.id, b]));
    const out = { reels: 0, brands: 0, failed: 0 };
    const merge = (a: string[], b: string[]) => [...new Set([...a.map((m) => m.toLowerCase()), ...b])];

    for (const b of brands ?? []) {
      const have = (b.moods ?? []) as string[];
      if (have.length >= BRAND_MOODS_MAX) continue;
      try {
        const add = await pickMoods({ brand: b.name, category: b.category, description: b.description, brandMoods: have }, catalog, { min: 1, max: BRAND_MOODS_MAX });
        const next = merge(have, add).slice(0, BRAND_MOODS_MAX);
        if (next.length > have.length) { await db.from("directory_brands").update({ moods: next }).eq("id", b.id); b.moods = next; out.brands++; }
      } catch { out.failed++; }
    }
    for (const r of dReels ?? []) {
      const b = byId.get(r.brand_id);
      try {
        const add = await pickMoods({ brand: b?.name ?? "", category: b?.category ?? "Other", title: r.display_title || r.title, description: r.description, tags: r.tags ?? [], brandMoods: b?.moods ?? [] }, catalog, { min: 2, max: REEL_AI_MAX });
        const next = merge(r.moods ?? [], add);
        if (next.length > (r.moods ?? []).length) { await db.from("directory_reels").update({ moods: next }).eq("id", r.id); out.reels++; }
      } catch { out.failed++; }
    }
    for (const r of sReels ?? []) {
      const b = r.brand_id ? byId.get(r.brand_id) : undefined;
      try {
        const add = await pickMoods({ brand: b?.name ?? r.brand, category: b?.category ?? r.category, title: r.display_title || r.title, description: r.description, brandMoods: b?.moods ?? [] }, catalog, { min: 2, max: REEL_AI_MAX });
        const next = merge(r.moods ?? [], add);
        if (next.length > (r.moods ?? []).length) { await db.from("site_reels").update({ moods: next }).eq("id", r.id); out.reels++; }
      } catch { out.failed++; }
    }
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "mood.auto_tag", target: `${out.reels} reels, ${out.brands} brands` });
    return out;
  });
