/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/udc_instagram_publishing_gravity_pants/v21.0";
const PAGE_ID = "1417009938164040"; // GravityPants Facebook page, linked to @gravity.pants

async function graph(path: string, init?: { method?: string; body?: Record<string, string> }) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conn = process.env["UDC_INSTAGRAM_PUBLISHING_GRAVITY_PANTS_API_KEY"];
  if (!lovable || !conn) throw new Error("Instagram connection is not set up.");
  const res = await fetch(`${GATEWAY}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn, "Content-Type": "application/x-www-form-urlencoded" },
    body: init?.body ? new URLSearchParams(init.body).toString() : undefined,
  });
  const text = await res.text();
  if (!res.ok) { console.error(`Instagram request failed [${res.status}]: ${text}`); throw new Error(`Instagram said no [${res.status}]: ${text.slice(0, 300)}`); }
  return JSON.parse(text);
}

async function staff(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admin role required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function igUser() {
  const r = await graph(`/${PAGE_ID}?fields=instagram_business_account`);
  const id = r?.instagram_business_account?.id;
  if (!id) throw new Error("No Instagram account is linked to the GravityPants page.");
  return id as string;
}

/** Staff only: upload a live reel to Instagram (processing starts; call checkInstagramPost to finish). */
export const startInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reelId: z.string().uuid(), caption: z.string().min(1).max(2200), coverAlt: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await staff(context);
    const { data: done } = await db.from("admin_audit_log").select("id").eq("action", "instagram.published").eq("target", data.reelId).limit(1);
    if (done?.length) throw new Error("This reel is already posted to Instagram.");
    const { data: reel } = await db.from("directory_reels").select("video_url, poster_url, status").eq("id", data.reelId).maybeSingle();
    if (!reel || reel.status !== "live" || !reel.video_url?.startsWith("media:")) throw new Error("This reel has no saved video.");
    const sign = async (p: string | null) => {
      if (!p?.startsWith("media:")) return p ?? null;
      const { data: s } = await db.storage.from("media").createSignedUrl(p.slice(6), 60 * 60 * 6);
      return s?.signedUrl ?? null;
    };
    const video = await sign(reel.video_url);
    const cover = await sign(reel.poster_url);
    if (!video) throw new Error("Couldn't prepare the video file.");
    const ig = await igUser();
    const body: Record<string, string> = { media_type: "REELS", video_url: video, caption: data.caption, share_to_feed: "true" };
    if (cover) body["cover_url"] = cover;
    const r = await graph(`/${ig}/media`, { method: "POST", body });
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "instagram.upload", target: data.reelId, reason: r.id });
    return { containerId: r.id as string };
  });

/** Staff only: check processing; publishes once Instagram has finished the video. */
export const checkInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reelId: z.string().uuid(), containerId: z.string().regex(/^\d+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await staff(context);
    const s = await graph(`/${data.containerId}?fields=status_code,status`);
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") return { state: "failed" as const, message: String(s.status ?? s.status_code) };
    if (s.status_code !== "FINISHED") return { state: "processing" as const };
    const { data: done } = await db.from("admin_audit_log").select("id").eq("action", "instagram.published").eq("target", data.reelId).limit(1);
    if (done?.length) return { state: "published" as const, permalink: null };
    const ig = await igUser();
    const p = await graph(`/${ig}/media_publish`, { method: "POST", body: { creation_id: data.containerId } });
    let permalink: string | null = null;
    try { permalink = (await graph(`/${p.id}?fields=permalink`)).permalink ?? null; } catch { /* optional */ }
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "instagram.published", target: data.reelId, reason: permalink ?? p.id });
    return { state: "published" as const, permalink };
  });
