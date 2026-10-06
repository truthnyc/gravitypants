import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { greetingConfigSchema, mergeGreeting, RULE_TYPES, type GreetingConfig } from "./greeting";

import { countryCode, parseLocation, fetchLocalWeather, type VisitorContext } from "./visitor-context";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = "directory_greeting";

export const getGreetingConfig = createServerFn({ method: "GET" }).handler(async (): Promise<GreetingConfig> => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data } = await (publicClient() as any).from("site_settings").select("value").eq("key", KEY).maybeSingle();
  return mergeGreeting(data?.value);
});

/** Location personalizes greetings only; it never controls access or billing. */
export const getVisitorContext = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ location: z.object({ country: z.string().length(2).nullable(), city: z.string().max(120).nullable(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional() }).optional().parse(value))
  .handler(async ({ data }): Promise<VisitorContext> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const req = getRequest() as Request & { cf?: { country?: unknown; city?: unknown; latitude?: unknown; longitude?: unknown } };
    const cf = req.cf ?? {};
    const country = countryCode(cf.country ?? req.headers.get("cf-ipcountry"));
    const city = typeof cf.city === "string" ? cf.city : req.headers.get("cf-ipcity");
    const location = parseLocation({ country, city, latitude: cf.latitude ?? req.headers.get("cf-iplatitude"), longitude: cf.longitude ?? req.headers.get("cf-iplongitude") }) ?? parseLocation(data?.location);
    if (!location) return { country, city, weather: null, needsLocation: true };
    return { country: location.country ?? country, city: location.city ?? city, weather: await fetchLocalWeather(location), needsLocation: false };
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
