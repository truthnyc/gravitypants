import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const range = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const adminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => range.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { computeAnalytics } = await import("./analytics.server");
    const until = new Date(new Date(`${data.to}T00:00:00Z`).getTime() + 86400000).toISOString();
    return computeAnalytics(db, new Date(`${data.from}T00:00:00Z`).toISOString(), until);
  });

export const adminSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteUrl: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await adminDb(context as any);
    const { searchReport } = await import("./analytics.server");
    return searchReport(data.siteUrl);
  });

export const getReportPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminDb(context as any);
    const { data } = await (context.supabase as any).from("admin_report_prefs").select("weekly_email").eq("user_id", context.userId).maybeSingle();
    return { weeklyEmail: data?.weekly_email ?? true };
  });

export const setReportPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ weeklyEmail: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await adminDb(context as any);
    const { error } = await (context.supabase as any).from("admin_report_prefs")
      .upsert({ user_id: context.userId, weekly_email: data.weeklyEmail, updated_at: new Date().toISOString() });
    if (error) throw new Error("Couldn't save the setting.");
    return { ok: true };
  });
