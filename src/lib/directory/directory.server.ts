/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DirectoryCard } from "./directory";

const POSTER_PREFIX = "media:";
export const SITE = "https://gravitypants.com";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Newest exported MP4 for an ad, as a media: path, or null when the ad was never exported. */
export async function findLatestVideo(sb: any, wsId: string, adId: string): Promise<string | null> {
  const root = `${wsId}/exports/${adId}`;
  const { data: stamps } = await sb.storage.from("media").list(root, { limit: 100, sortBy: { column: "name", order: "desc" } });
  for (const s of stamps ?? []) {
    if (!s.name || s.name.startsWith(".")) continue;
    const { data: files } = await sb.storage.from("media").list(`${root}/${s.name}`, { limit: 100 });
    const mp4 = (files ?? []).filter((f: any) => f.name?.endsWith(".mp4")).sort((a: any, b: any) => a.name.localeCompare(b.name)).pop();
    if (mp4) return `${POSTER_PREFIX}${root}/${s.name}/${mp4.name}`;
  }
  return null;
}

/** Turns live reel rows into public cards: signed posters and videos, seconds and photo counts (never other ad content). */
export async function toCards(rows: any[]): Promise<DirectoryCard[]> {
  if (!rows.length) return [];
  const sb = await admin();
  const ids = rows.map((r) => r.reel_id ?? r.id);
  const { data: extra } = await sb.from("directory_reels")
    .select("id, ad_id, template_id, poster_url, video_url, title, description, directory_brands(website_url, workspace_id)")
    .in("id", ids);
  // Reels shared before videos were stored get theirs found now, once.
  for (const e of extra ?? []) {
    if (!e.video_url && e.ad_id && e.directory_brands?.workspace_id) {
      const v = await findLatestVideo(sb, e.directory_brands.workspace_id, e.ad_id);
      if (v) {
        await sb.from("directory_reels").update({ video_url: v }).eq("id", e.id);
        e.video_url = v;
      }
    }
  }
  const ex = new Map<string, any>((extra ?? []).map((e: any) => [e.id, e]));
  const adIds = (extra ?? []).map((e: any) => e.ad_id);
  const { data: frames } = adIds.length ? await sb.from("frames").select("project_id, duration_sec").in("project_id", adIds) : { data: [] };
  const len = new Map<string, { sec: number; n: number }>();
  for (const f of frames ?? []) {
    const v = len.get(f.project_id) ?? { sec: 0, n: 0 };
    v.sec += Number(f.duration_sec);
    v.n += 1;
    len.set(f.project_id, v);
  }
  const paths = (extra ?? []).flatMap((e: any) => [e.poster_url, e.video_url]).filter((p: string | null) => p?.startsWith(POSTER_PREFIX)).map((p: string) => p.slice(POSTER_PREFIX.length));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await sb.storage.from("media").createSignedUrls(paths, 60 * 60 * 24);
    for (const x of data ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
  }
  return rows.map((r) => {
    const id = r.reel_id ?? r.id;
    const e = ex.get(id);
    const l = len.get(e?.ad_id) ?? { sec: 0, n: 0 };
    const p: string | null = e?.poster_url ?? null;
    const v: string | null = e?.video_url ?? null;
    return {
      reel_id: id,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      category: r.category,
      tags: r.tags ?? [],
      moods: r.moods ?? [],
      formats: r.formats ?? [],
      poster: p?.startsWith(POSTER_PREFIX) ? signed.get(p.slice(POSTER_PREFIX.length)) ?? null : p,
      video: v?.startsWith(POSTER_PREFIX) ? signed.get(v.slice(POSTER_PREFIX.length)) ?? null : v,
      title: e?.title ?? null,
      template_name: r.template_name ?? null,
      template_id: e?.template_id ?? null,
      featured: !!r.featured,
      seconds: Math.round(l.sec * 10) / 10,
      photos: l.n,
      description: e?.description ?? null,
      website_url: e?.directory_brands?.website_url ?? null,
    };
  });
}

/** Email address of a brand's workspace owner. */
export async function brandOwnerEmail(brandId: string): Promise<{ email: string | null; name: string; slug: string; ws: string } | null> {
  const sb = await admin();
  const { data: b } = await sb.from("directory_brands").select("name, slug, workspace_id, workspaces(owner_id)").eq("id", brandId).maybeSingle();
  if (!b) return null;
  const owner = b.workspaces?.owner_id;
  let email: string | null = null;
  if (owner) {
    const { data } = await sb.auth.admin.getUserById(owner);
    email = data?.user?.email ?? null;
  }
  return { email, name: b.name, slug: b.slug, ws: b.workspace_id };
}

export async function sendDirectoryEmail(to: string, key: string, data: { subject: string; heading: string; paragraphs: string[]; buttonLabel?: string; buttonUrl?: string; secondaryLabel?: string; secondaryUrl?: string }) {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("directory-notice", to, { templateData: data, idempotencyKey: key });
  } catch (e) {
    console.error("directory email failed", key, e);
  }
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });

/** Daily: record plan ends and renewals, and send the day 0/14/25 reminders. Reels hide on their own after 30 days (brand_visible). */
export async function runDirectoryDaily() {
  const sb = await admin();
  const { data: brands } = await sb.from("directory_brands").select("id, workspace_id, plan_ended_at, grace_emails_sent");
  let ended = 0, renewed = 0, mailed = 0;
  for (const b of brands ?? []) {
    const { data: plan } = await sb.rpc("directory_effective_plan", { _ws: b.workspace_id });
    if (plan) {
      if (b.plan_ended_at) {
        await sb.from("directory_brands").update({ plan_ended_at: null, grace_emails_sent: 0 }).eq("id", b.id);
        renewed++;
      }
      continue;
    }
    const { count } = await sb.from("directory_reels").select("id", { count: "exact", head: true }).eq("brand_id", b.id).eq("status", "live");
    if (!count) continue;
    let endedAt = b.plan_ended_at ? new Date(b.plan_ended_at) : null;
    if (!endedAt) {
      const { data: bill } = await sb.from("workspace_billing").select("current_period_end").eq("workspace_id", b.workspace_id).maybeSingle();
      const pe = bill?.current_period_end ? new Date(bill.current_period_end) : null;
      endedAt = pe && pe < new Date() ? pe : new Date();
      await sb.from("directory_brands").update({ plan_ended_at: endedAt.toISOString(), grace_emails_sent: 0 }).eq("id", b.id);
      ended++;
    }
    const day = Math.floor((Date.now() - endedAt.getTime()) / 86_400_000);
    const due = [0, 14, 25].filter((d) => day >= d && day < 30).length;
    if (due > (b.grace_emails_sent ?? 0)) {
      const o = await brandOwnerEmail(b.id);
      const hideOn = fmt(new Date(endedAt.getTime() + 30 * 86_400_000));
      if (o?.email) {
        await sendDirectoryEmail(o.email, `dir-grace-${b.id}-${endedAt.toISOString()}-${due}`, {
          subject: due === 1 ? "Your plan ended. Your Directory reels stay live for 30 days" : `Your Directory reels hide on ${hideOn}`,
          heading: due === 1 ? "Your plan has ended" : `Your reels hide on ${hideOn}`,
          paragraphs: [
            `Your Gravity Pants plan ended on ${fmt(endedAt)}. Your reels for ${o.name} stay in the Directory until ${hideOn}.`,
            "Renew before then to keep them live. After that they're hidden, not deleted, and come back as soon as you renew.",
          ],
          buttonLabel: "Renew plan",
          buttonUrl: `${SITE}/app/account/billing`,
        });
        mailed++;
      }
      await sb.from("directory_brands").update({ grace_emails_sent: due }).eq("id", b.id);
    }
  }
  return { ended, renewed, mailed };
}
