import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { greetingConfigSchema, mergeGreeting, RULE_TYPES, type GreetingConfig, type WeatherKind } from "./greeting";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = "directory_greeting";

export const getGreetingConfig = createServerFn({ method: "GET" }).handler(async (): Promise<GreetingConfig> => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data } = await (publicClient() as any).from("site_settings").select("value").eq("key", KEY).maybeSingle();
  return mergeGreeting(data?.value);
});

type Wx = { kind: WeatherKind; tempC: number; isDay: boolean; sunset: string | null };
const wxCache = new Map<string, { at: number; wx: Wx | null }>();

function wxKind(code: number): WeatherKind {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code <= 1) return "clear";
  return "cloudy";
}

/** Approximate visitor context from hosting geo headers. Nothing is stored; weather failures are silent. */
export const getVisitorContext = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest() as any;
  const cf = req?.cf ?? {};
  const country: string | null = (cf.country ?? req?.headers?.get?.("cf-ipcountry") ?? null) || null;
  const city: string | null = cf.city ?? null;
  const lat = Number(cf.latitude), lon = Number(cf.longitude);
  let weather: Wx | null = null;
  if (Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon)) {
    const key = city ?? `${lat.toFixed(1)},${lon.toFixed(1)}`;
    const hit = wxCache.get(key);
    if (hit && Date.now() - hit.at < 30 * 60000) weather = hit.wx;
    else {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=temperature_2m,weather_code,is_day&daily=sunset&timezone=GMT&forecast_days=1`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const j: any = await res.json();
          weather = { kind: wxKind(Number(j.current?.weather_code ?? 3)), tempC: Number(j.current?.temperature_2m ?? 15), isDay: j.current?.is_day === 1, sunset: j.daily?.sunset?.[0] ? `${j.daily.sunset[0]}Z` : null };
        }
      } catch { weather = null; }
      wxCache.set(key, { at: Date.now(), wx: weather });
    }
  }
  return { country: country && country !== "XX" ? country.toUpperCase() : null, city, weather };
});

async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const saveGreetingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ value: greetingConfigSchema.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { error } = data.value
      ? await db.from("site_settings").upsert({ key: KEY, value: mergeGreeting(data.value), updated_at: new Date().toISOString(), updated_by: context.userId })
      : await db.from("site_settings").delete().eq("key", KEY);
    if (error) throw new Error(error.message);
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.value ? "directory_greeting.update" : "directory_greeting.reset", workspace_id: null, target: "directory headline" });
    return { ok: true };
  });

export const getGreetingAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context);
    const [{ data: row }, { data: log }] = await Promise.all([
      db.from("site_settings").select("value").eq("key", KEY).maybeSingle(),
      db.from("directory_greeting_log").select("rule, session_id, action").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(50000),
    ]);
    const stats: Record<string, { shown: number; clicks: number; filters: number }> = {};
    const shownSessions = new Map<string, Set<string>>(), clickSessions = new Map<string, Set<string>>(), filterSessions = new Map<string, Set<string>>();
    for (const r of (log ?? []) as any[]) {
      const m = r.action === "shown" ? shownSessions : r.action === "mood_click" ? clickSessions : filterSessions;
      if (!m.has(r.rule)) m.set(r.rule, new Set());
      m.get(r.rule)!.add(r.session_id);
      const st = (stats[r.rule] ??= { shown: 0, clicks: 0, filters: 0 });
      if (r.action === "shown") st.shown++;
    }
    for (const [rule, st] of Object.entries(stats)) {
      st.clicks = clickSessions.get(rule)?.size ?? 0;
      st.filters = filterSessions.get(rule)?.size ?? 0;
    }
    return { config: mergeGreeting(row?.value), saved: !!row, stats: RULE_TYPES.filter((r) => stats[r]).map((rule) => ({ rule, shown: stats[rule]!.shown, sessions: shownSessions.get(rule)?.size ?? 0, clicks: stats[rule]!.clicks, filters: stats[rule]!.filters })) };
  });
