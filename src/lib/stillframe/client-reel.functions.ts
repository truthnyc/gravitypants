import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { storageRef } from "./brand-home.functions";
import { movementLabel } from "./movement-label";

// One client reel: the final video (signed, downloadable) and each photo's movement.
// Keys match Brand home: own:<projectId>, dir:<directoryReelId>, site:<siteReelId>.

export type ClientReelFrame = { id: string; photoUrl: string | null; seconds: number; custom: boolean; movement: string };
export type ClientReel = { title: string; videoUrl: string | null; downloadUrl: string | null; fileName: string; frames: ClientReelFrame[] };

const input = z.object({ workspaceId: z.string().uuid(), key: z.string().regex(/^(own|dir|site):[0-9a-f-]{36}$/) });
const safeName = (t: string) => `${t.replace(/[^\w -]+/g, "").trim() || "reel"}.mp4`;

export const getClientReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }): Promise<ClientReel | null> => {
    const sb = context.supabase;
    const { data: member } = await sb.rpc("is_workspace_member", { _ws: data.workspaceId });
    if (!member) throw new Error("You don't have access to this workspace.");
    const [kind, id] = data.key.split(":") as ["own" | "dir" | "site", string];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    type FrameRow = { id: string; duration_sec: number; photo: unknown; sort_order: number };
    const thumb = async (u: string | undefined) => {
      if (!u) return null;
      if (/^https?:|^\//.test(u)) return u;
      const { data: t } = await supabaseAdmin.storage.from("media").createSignedUrl(u.replace(/^media:/, ""), 3600, { transform: { width: 240, quality: 70 } });
      return t?.signedUrl ?? null;
    };
    const mapFrames = (rows: FrameRow[] | null) =>
      Promise.all((rows ?? []).sort((a, b) => a.sort_order - b.sort_order).map(async (f) => {
        const p = (f.photo ?? {}) as { url?: string; movement?: string };
        const m = movementLabel(p);
        return { id: f.id, photoUrl: await thumb(p.url), seconds: Number(f.duration_sec), custom: m.custom, movement: m.text };
      }));
    const sign = async (bucket: "media" | "site-reels", path: string, name: string) => {
      const [{ data: v }, { data: d }] = await Promise.all([
        supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600),
        supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600, { download: name }),
      ]);
      return { videoUrl: v?.signedUrl ?? null, downloadUrl: d?.signedUrl ?? null };
    };

    if (kind === "own") {
      // RLS: the project is only readable by members of its workspace.
      const { data: p } = await sb.from("projects").select("id,name,workspace_id,deleted_at").eq("id", id).maybeSingle();
      if (!p || p.deleted_at || p.workspace_id !== data.workspaceId) return null;
      const { data: frames } = await sb.from("frames").select("id,duration_sec,photo,sort_order").eq("project_id", id);
      const root = `${data.workspaceId}/exports/${id}`;
      const { data: stamps } = await sb.storage.from("media").list(root, { limit: 100 });
      let video: { videoUrl: string | null; downloadUrl: string | null } = { videoUrl: null, downloadUrl: null };
      const name = safeName(p.name || "reel");
      for (const s of (stamps ?? []).filter((x) => !x.id).map((x) => x.name).sort().reverse()) {
        const { data: files } = await sb.storage.from("media").list(`${root}/${s}`, { limit: 100 });
        const mp4 = (files ?? []).find((f) => f.id && /\.mp4$/i.test(f.name));
        if (mp4) { video = await sign("media", `${root}/${s}/${mp4.name}`, name); break; }
      }
      return { title: p.name || "Untitled ad", fileName: name, frames: await mapFrames(frames as FrameRow[]), ...video };
    }

    // Brand-page reels: confirm the reel's brand belongs to this workspace before reading.
    const { data: r } = kind === "dir"
      ? await supabaseAdmin.from("directory_reels").select("brand_id,ad_id,display_title,title,video_url,status").eq("id", id).eq("status", "live").maybeSingle()
      : await supabaseAdmin.from("site_reels").select("brand_id,display_title,title,video_url,published").eq("id", id).eq("published", true).maybeSingle();
    if (!r?.brand_id) return null;
    const { data: brand } = await supabaseAdmin.from("directory_brands").select("workspace_id").eq("id", r.brand_id).maybeSingle();
    if (brand?.workspace_id !== data.workspaceId) return null;
    const title = r.display_title || r.title || "Untitled reel";
    const ref = storageRef(r.video_url);
    const video = ref ? await sign(ref.bucket, ref.path, safeName(title)) : { videoUrl: null, downloadUrl: null };
    let frames: ClientReelFrame[] = [];
    if (kind === "dir" && "ad_id" in r && r.ad_id) {
      const { data: rows } = await supabaseAdmin.from("frames").select("id,duration_sec,photo,sort_order").eq("project_id", r.ad_id);
      frames = await mapFrames(rows as FrameRow[]);
    }
    return { title, fileName: safeName(title), frames, ...video };
  });
