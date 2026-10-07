import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planTier } from "@/lib/stillframe/plan";
import { rankRows, statsAllowed, tipFor } from "./brand-stats";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Public: logs a shop/website click. The server resolves brand + workspace from live rows only. */
export const recordBrandClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["directory", "site", "brand"]), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let brandId: string | null = null;
    if (data.kind === "directory") {
      const { data: r } = await db.from("directory_reels").select("brand_id").eq("id", data.id).eq("status", "live").maybeSingle();
      brandId = r?.brand_id ?? null;
    } else if (data.kind === "site") {
      const { data: r } = await db.from("site_reels").select("brand_id").eq("id", data.id).eq("published", true).maybeSingle();
      brandId = r?.brand_id ?? null;
    } else brandId = data.id;
    if (!brandId) return { recorded: false };
    const { data: b } = await db.from("directory_brands").select("id, workspace_id, status").eq("id", brandId).maybeSingle();
    if (!b || b.status !== "live") return { recorded: false };
    await db.from("directory_click_events").insert({
      workspace_id: b.workspace_id, brand_id: b.id,
      reel_id: data.kind === "brand" ? null : data.id, reel_kind: data.kind === "brand" ? null : data.kind,
    });
    return { recorded: true };
  });

export const getBrandStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid(), days: z.union([z.literal(7), z.literal(30), z.literal(90)]), brandId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: member }, { data: billing }, { data: admin }] = await Promise.all([
      sb.rpc("is_workspace_member", { _ws: data.workspaceId }),
      sb.rpc("effective_billing", { _ws: data.workspaceId }),
      sb.rpc("is_platform_admin"),
    ]);
    if (member !== true) throw new Error("Not a member of this account.");
    if (!statsAllowed(planTier(billing), admin === true)) return { allowed: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: brands } = await db.from("directory_brands").select("id, name").eq("workspace_id", data.workspaceId).order("name");
    const all = (brands ?? []) as { id: string; name: string }[];
    const ids = data.brandId ? all.filter((b) => b.id === data.brandId).map((b) => b.id) : all.map((b) => b.id);
    const now = Date.now(), span = data.days * 86400000;
    const since = new Date(now - span).toISOString(), prevSince = new Date(now - 2 * span).toISOString();
    const empty = { allowed: true as const, brands: all, totals: { views: 0, saves: 0, clicks: 0 }, previous: { views: 0, saves: 0, clicks: 0 }, days: [] as any[], reels: [] as any[], moods: [] as any[], formats: [] as any[], tip: null as string | null };
    if (!ids.length) return empty;

    const [{ data: dReels }, { data: sReels }] = await Promise.all([
      db.from("directory_reels").select("id, title, moods, formats, poster_url").in("brand_id", ids),
      db.from("site_reels").select("id, title, moods, format, poster_url").in("brand_id", ids),
    ]);
    const reels = new Map<string, { name: string; moods: string[]; formats: string[]; poster: string | null }>();
    for (const r of dReels ?? []) reels.set(r.id, { name: r.title ?? "Untitled reel", moods: r.moods ?? [], formats: r.formats ?? [], poster: r.poster_url });
    for (const r of sReels ?? []) reels.set(r.id, { name: r.title, moods: r.moods ?? [], formats: r.format ? [r.format] : [], poster: null });
    const reelIds = [...reels.keys()];

    const fetchAll = async (q: () => any) => {
      const out: any[] = [];
      for (let f = 0; f < 200000; f += 1000) { const { data: rows } = await q().range(f, f + 999); out.push(...(rows ?? [])); if (!rows || rows.length < 1000) break; }
      return out;
    };
    const none = ["00000000-0000-0000-0000-000000000000"];
    const [views, saves, brandSaves, clicks] = await Promise.all([
      fetchAll(() => db.from("directory_reel_views").select("reel_id, created_at").in("reel_id", reelIds.length ? reelIds : none).gte("created_at", prevSince)),
      fetchAll(() => db.from("directory_reel_favorites").select("reel_id, created_at").in("reel_id", reelIds.length ? reelIds : none).gte("created_at", prevSince)),
      fetchAll(() => db.from("directory_favorites").select("brand_id, created_at").in("brand_id", ids).gte("created_at", prevSince)),
      fetchAll(() => db.from("directory_click_events").select("reel_id, created_at").in("brand_id", ids).gte("created_at", prevSince)),
    ]);
    const cur = (r: any) => r.created_at >= since;
    const count = (rows: any[], f: (r: any) => boolean) => rows.filter(f).length;
    const totals = { views: count(views, cur), saves: count(saves, cur) + count(brandSaves, cur), clicks: count(clicks, cur) };
    const previous = { views: views.length - totals.views, saves: saves.length + brandSaves.length - totals.saves, clicks: clicks.length - totals.clicks };

    const dayMap = new Map<string, { views: number; saves: number; clicks: number }>();
    for (let t = now - span + 86400000; t <= now; t += 86400000) dayMap.set(new Date(t).toISOString().slice(0, 10), { views: 0, saves: 0, clicks: 0 });
    const addDay = (rows: any[], k: "views" | "saves" | "clicks") => { for (const r of rows) { const d = dayMap.get(r.created_at.slice(0, 10)); if (d && cur(r)) d[k]++; } };
    addDay(views, "views"); addDay(saves, "saves"); addDay(brandSaves, "saves"); addDay(clicks, "clicks");

    const per = new Map<string, { views: number; saves: number; clicks: number }>();
    const bump = (rows: any[], k: "views" | "saves" | "clicks") => { for (const r of rows) { if (!cur(r) || !r.reel_id || !reels.has(r.reel_id)) continue; const p = per.get(r.reel_id) ?? { views: 0, saves: 0, clicks: 0 }; p[k]++; per.set(r.reel_id, p); } };
    bump(views, "views"); bump(saves, "saves"); bump(clicks, "clicks");
    const group = (key: (id: string) => string[]) => {
      const m = new Map<string, { views: number; saves: number; clicks: number }>();
      for (const [id, s] of per) for (const g of key(id)) { const a = m.get(g) ?? { views: 0, saves: 0, clicks: 0 }; a.views += s.views; a.saves += s.saves; a.clicks += s.clicks; m.set(g, a); }
      return rankRows([...m].map(([name, s]) => ({ name, ...s })));
    };
    const moods = group((id) => reels.get(id)!.moods);
    return {
      ...empty, totals, previous,
      days: [...dayMap].map(([day, s]) => ({ day, ...s })),
      reels: rankRows(reelIds.map((id) => ({ name: reels.get(id)!.name, ...(per.get(id) ?? { views: 0, saves: 0, clicks: 0 }) }))).slice(0, 25),
      moods, formats: group((id) => reels.get(id)!.formats), tip: tipFor(moods),
    };
  });
