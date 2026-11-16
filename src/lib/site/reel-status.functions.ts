/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reelVideoStatus, type ReelVideoStatus } from "./reel-status";

export type ShowcaseStatusRow = { id: string; brand: string; title: string; source: "studio" | "client"; status: ReelVideoStatus };

/** Staff only: video status of every reel chosen for Showcase, including ones hidden because they cannot play. */
export const showcaseReelStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShowcaseStatusRow[]> => {
    const { data: ok } = await (context.supabase as any).rpc("is_platform_admin");
    if (!ok) throw new Error("Admin role required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { findLatestVideo } = await import("@/lib/directory/directory.server");
    const out: ShowcaseStatusRow[] = [];
    const { data: site } = await sb.from("site_reels").select("id, brand, title, video_url").eq("published", true).order("sort_order");
    for (const r of site ?? []) out.push({ id: r.id, brand: r.brand, title: r.title, source: "studio", status: reelVideoStatus({ video_url: r.video_url, hasExport: false }) });
    const { data: dir } = await sb.from("directory_reels")
      .select("id, ad_id, title, video_url, pending_video_url, directory_brands(name)")
      .eq("in_showcase", true).eq("status", "live").order("showcase_order");
    for (const r of dir ?? []) {
      let hasExport = false;
      if (!r.video_url && r.ad_id) {
        const { data: p } = await sb.from("projects").select("workspace_id").eq("id", r.ad_id).maybeSingle();
        if (p?.workspace_id) hasExport = !!(await findLatestVideo(sb, p.workspace_id, r.ad_id).catch(() => null));
      }
      out.push({ id: r.id, brand: r.directory_brands?.name ?? "", title: r.title, source: "client", status: reelVideoStatus({ ...r, hasExport }) });
    }
    return out;
  });
