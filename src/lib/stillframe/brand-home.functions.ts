import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Brand home: one place where a client sees every reel tied to their workspace
// (their own ads, reels staff made for their brand, their live Aimanté reels) and
// sends files to Klaviyo (existing klaviyo.functions) and their own Shopify store.

const ws = z.object({ workspaceId: z.string().uuid() });
type Sb = { rpc: (fn: "is_workspace_member" | "is_workspace_admin", a: { _ws: string }) => PromiseLike<{ data: boolean | null }> };

async function assertMember(sb: Sb, workspaceId: string, admin = false) {
  const { data } = await sb.rpc(admin ? "is_workspace_admin" : "is_workspace_member", { _ws: workspaceId });
  if (!data) throw new Error(admin ? "Only account owners and admins can connect a store." : "You don't have access to this workspace.");
}

export type HomeFile = { name: string; kind: "gif" | "mp4" | "other"; source: { type: "export"; projectId: string; stamp: string } | { type: "directory" | "site"; reelId: string } };
export type HomeReel = { key: string; title: string; origin: "own" | "staff" | "live"; live: boolean; posterUrl: string | null; posterRef: string | null; previewUrl: string | null; updated: string | null; files: HomeFile[]; editId: string | null };

const kindOf = (n: string): HomeFile["kind"] => (/\.gif$/i.test(n) ? "gif" : /\.mp4$/i.test(n) ? "mp4" : "other");

/** Splits "media:path" / "site-reels:path" refs into bucket + path; null for anything else. */
export function storageRef(ref: string | null | undefined): { bucket: "media" | "site-reels"; path: string } | null {
  if (!ref) return null;
  const m = ref.match(/^(media|site-reels):(.+)$/);
  return m ? { bucket: m[1] as "media" | "site-reels", path: m[2]! } : null;
}

export const getBrandHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertMember(sb, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const root = `${data.workspaceId}/exports`;

    // Own ads: latest export of each ad (files listed from storage, like Previous Exports).
    const { data: dirs } = await sb.storage.from("media").list(root, { limit: 500 });
    const ids = (dirs ?? []).filter((d) => !d.id).map((d) => d.name);
    const { data: projects } = ids.length
      ? await sb.from("projects").select("id,name,thumbnail_url,deleted_at").in("id", ids)
      : { data: [] as { id: string; name: string; thumbnail_url: string | null; deleted_at: string | null }[] };
    const own: HomeReel[] = [];
    await Promise.all(
      (projects ?? []).filter((p) => !p.deleted_at).map(async (p) => {
        const { data: stamps } = await sb.storage.from("media").list(`${root}/${p.id}`, { limit: 100 });
        const sorted = (stamps ?? []).filter((s) => !s.id).map((s) => s.name).sort().reverse();
        for (const stamp of sorted) {
          const { data: files } = await sb.storage.from("media").list(`${root}/${p.id}/${stamp}`, { limit: 100 });
          const list = (files ?? []).filter((f) => f.id).map((f) => f.name);
          if (!list.length) continue;
          own.push({
            key: `own:${p.id}`, title: p.name || "Untitled ad", origin: "own", live: false, posterUrl: null, posterRef: p.thumbnail_url, previewUrl: null, updated: stamp, editId: p.id,
            files: list.map((name) => ({ name, kind: kindOf(name), source: { type: "export" as const, projectId: p.id, stamp } })),
          });
          break;
        }
      }),
    );

    // Reels on this workspace's brand pages (staff-made and live Aimanté reels). Read with the
    // service client only after membership is confirmed, scoped to this workspace's brands.
    const { data: brands } = await supabaseAdmin.from("directory_brands").select("id").eq("workspace_id", data.workspaceId);
    const brandIds = (brands ?? []).map((b) => b.id);
    const sign = async (ref: string | null) => {
      const r = storageRef(ref);
      if (!r) return ref && ref.startsWith("/") ? ref : null;
      const { data: s } = await supabaseAdmin.storage.from(r.bucket).createSignedUrl(r.path, 3600);
      return s?.signedUrl ?? null;
    };
    const ownIds = new Set(own.map((o) => o.editId));
    const others: HomeReel[] = [];
    if (brandIds.length) {
      const [{ data: dr }, { data: sr }] = await Promise.all([
        supabaseAdmin.from("directory_reels").select("id,ad_id,display_title,title,poster_url,video_url,status,updated_at").in("brand_id", brandIds).eq("status", "live"),
        supabaseAdmin.from("site_reels").select("id,display_title,title,poster_url,video_url,updated_at").in("brand_id", brandIds).eq("published", true),
      ]);
      for (const r of dr ?? []) {
        if (ownIds.has(r.ad_id)) {
          const o = own.find((x) => x.editId === r.ad_id);
          if (o) o.live = true;
          continue;
        }
        const name = `${(r.display_title || r.title || "reel").replace(/[^\w -]+/g, "").trim() || "reel"}.mp4`;
        others.push({ key: `dir:${r.id}`, title: r.display_title || r.title || "Untitled reel", origin: "live", live: true, posterUrl: await sign(r.poster_url), posterRef: null, previewUrl: await sign(r.video_url), updated: r.updated_at, editId: null, files: r.video_url ? [{ name, kind: "mp4", source: { type: "directory", reelId: r.id } }] : [] });
      }
      for (const r of sr ?? []) {
        const name = `${(r.display_title || r.title || "reel").replace(/[^\w -]+/g, "").trim() || "reel"}.mp4`;
        others.push({ key: `site:${r.id}`, title: r.display_title || r.title, origin: "staff", live: true, posterUrl: await sign(r.poster_url), posterRef: null, previewUrl: await sign(r.video_url), updated: r.updated_at, editId: null, files: storageRef(r.video_url) ? [{ name, kind: "mp4", source: { type: "site", reelId: r.id } }] : [] });
      }
    }
    own.sort((a, b) => ((a.updated ?? "") < (b.updated ?? "") ? 1 : -1));

    const { data: shop } = await supabaseAdmin.from("shopify_shops").select("shop_domain").eq("web_workspace_id", data.workspaceId).is("uninstalled_at", null).maybeSingle();
    return { reels: [...own, ...others], shop: shop?.shop_domain ?? null, configured: Boolean(process.env["SHOPIFY_API_KEY"] && process.env["SHOPIFY_API_SECRET"]) };
  });

export const startShopifyConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.extend({ shop: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId, true);
    const apiKey = process.env["SHOPIFY_API_KEY"];
    const secret = process.env["SHOPIFY_API_SECRET"];
    if (!apiKey || !secret) return { ok: false as const, error: "Shopify isn't set up yet." };
    const { normalizeShop, signState, WEB_SCOPES } = await import("@/lib/shopify/shopify.server");
    const shop = normalizeShop(data.shop);
    if (!shop) return { ok: false as const, error: "Enter your store address, like mystore.myshopify.com." };
    const u = new URL(getRequest().url);
    const origin = `${u.hostname === "localhost" ? u.protocol : "https:"}//${u.host}`;
    const state = await signState({ ws: data.workspaceId, uid: context.userId, shop, exp: Date.now() + 10 * 60_000 }, secret);
    const q = new URLSearchParams({ client_id: apiKey, scope: WEB_SCOPES, redirect_uri: `${origin}/api/public/shopify/connect`, state });
    return { ok: true as const, url: `https://${shop}/admin/oauth/authorize?${q}` };
  });

export const disconnectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("shopify_shops").update({ web_workspace_id: null }).eq("web_workspace_id", data.workspaceId);
    return { ok: true };
  });

async function shopFor(workspaceId: string) {
  const apiKey = process.env["SHOPIFY_API_KEY"];
  const secret = process.env["SHOPIFY_API_SECRET"];
  const tokenKey = process.env["SHOPIFY_TOKEN_KEY"];
  if (!apiKey || !secret || !tokenKey) throw new Error("Shopify isn't set up yet.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("shopify_shops")
    .select("shop_domain, access_token, refresh_token, token_expires_at, refresh_token_expires_at")
    .eq("web_workspace_id", workspaceId)
    .is("uninstalled_at", null)
    .maybeSingle();
  if (!row) throw new Error("Connect your Shopify store first.");
  const { tokenGetter } = await import("@/lib/shopify/session.server");
  const get = tokenGetter(supabaseAdmin, row, { apiKey, secret, tokenKey });
  try {
    return { shop: row.shop_domain, token: await get(), admin: supabaseAdmin };
  } catch {
    throw new Error("Your store connection has expired. Connect Shopify again.");
  }
}

export const searchShopifyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.extend({ q: z.string().max(100).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    try {
      const { shop, token } = await shopFor(data.workspaceId);
      const { adminGraphql } = await import("@/lib/shopify/shopify.server");
      const q = data.q.replace(/["\\]/g, "").trim();
      const r = await adminGraphql<{ products: { nodes: { id: string; title: string; featuredMedia: { preview: { image: { url: string } | null } | null } | null }[] } }>(
        shop, token,
        `query P($q: String) { products(first: 20, query: $q, sortKey: UPDATED_AT, reverse: true) { nodes { id title featuredMedia { preview { image { url(transform: { maxWidth: 120 }) } } } } } }`,
        { q: q ? `title:*${q}*` : null },
      );
      return { ok: true as const, products: r.products.nodes.map((p) => ({ id: p.id, title: p.title, image: p.featuredMedia?.preview?.image?.url ?? null })) };
    } catch (e) {
      console.error("brand home product search", e);
      return { ok: false as const, error: e instanceof Error && !e.message.startsWith("Shopify GraphQL") ? e.message : "Couldn't load your products. Try again." };
    }
  });

const sendSchema = ws.extend({
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("export"), projectId: z.string().uuid(), stamp: z.string().regex(/^[A-Za-z0-9T:.\-Z]{1,40}$/), name: z.string().regex(/^[^/\\]{1,200}\.(gif|mp4)$/i) }),
    z.object({ type: z.enum(["directory", "site"]), reelId: z.string().uuid() }),
  ]),
  productIds: z.array(z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/)).min(1).max(20),
});

export const sendToShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    try {
      const { shop, token, admin } = await shopFor(data.workspaceId);
      let blob: Blob | null = null;
      let filename = "reel.mp4";
      let alt = "Product video";
      const s = data.source;
      if (s.type === "export") {
        // The user's own client: storage RLS confirms the file is in their workspace.
        const { data: f } = await context.supabase.storage.from("media").download(`${data.workspaceId}/exports/${s.projectId}/${s.stamp}/${s.name}`);
        blob = f;
        filename = s.name;
        const { data: p } = await context.supabase.from("projects").select("name").eq("id", s.projectId).maybeSingle();
        alt = p?.name ?? alt;
      } else {
        const { data: brands } = await admin.from("directory_brands").select("id").eq("workspace_id", data.workspaceId);
        const ids = (brands ?? []).map((b) => b.id);
        if (!ids.length) return { ok: false as const, error: "That reel isn't on your brand page." };
        const q = s.type === "directory"
          ? admin.from("directory_reels").select("video_url,display_title,title").eq("id", s.reelId).eq("status", "live").in("brand_id", ids)
          : admin.from("site_reels").select("video_url,display_title,title").eq("id", s.reelId).eq("published", true).in("brand_id", ids);
        const { data: r } = await q.maybeSingle();
        const ref = storageRef(r?.video_url);
        if (!r || !ref) return { ok: false as const, error: "That reel isn't on your brand page." };
        const { data: f } = await admin.storage.from(ref.bucket).download(ref.path);
        blob = f;
        alt = r.display_title || r.title || alt;
        filename = `${alt.replace(/[^\w -]+/g, "").trim() || "reel"}.mp4`;
      }
      if (!blob) return { ok: false as const, error: "That file couldn't be found. It may have been deleted after 30 days." };
      if (/\.gif$/i.test(filename) && blob.size > 20 * 1024 * 1024) return { ok: false as const, error: "This GIF is over Shopify's 20 MB image limit. Export a smaller GIF." };
      const { addMediaToProducts } = await import("@/lib/shopify/product-media.server");
      const r = await addMediaToProducts(shop, token, blob, filename, data.productIds, alt);
      if (r.failed.length) console.error("brand home shopify media", r.failed);
      return { ok: true as const, added: r.added, failed: r.failed.length };
    } catch (e) {
      console.error("brand home send to shopify", e);
      const m = e instanceof Error ? e.message : "";
      return { ok: false as const, error: /Connect|expired|set up/.test(m) ? m : "Shopify couldn't take this file. Try again." };
    }
  });
