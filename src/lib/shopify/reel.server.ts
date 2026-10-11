// Server-only: copy Shopify photos into private media storage and save reels for a shop's workspace.
import type { ProjectWithFrames } from "@/lib/stillframe/types";
import type { shopFromRequest } from "./session.server";
import { adminGraphql } from "./shopify.server";
import { productPrice, type PickedProduct } from "./reel-build";
import { BRAND_BUCKET, BRAND_PREFIX } from "./branding.server";

type Admin = Awaited<ReturnType<typeof shopFromRequest>>["admin"];
const MEDIA_BUCKET = "media";
const OK_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 20 * 1024 * 1024;

/** Copies one Shopify CDN image to `<ws>/shopify/<stamp>/<n>.<ext>`; returns null when it can't be used. */
export async function copyImage(admin: Admin, ws: string, stamp: string, n: number, url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !(u.hostname === "cdn.shopify.com" || u.hostname.endsWith(".shopify.com") || u.hostname.endsWith(".shopifycdn.com"))) return null;
  u.searchParams.set("width", "2048"); // cap very large originals
  const res = await fetch(u.toString());
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const ext = OK_TYPES[type]; // SVG and other non-photo types are skipped
  if (!ext) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
  const path = `${ws}/shopify/${stamp}/${String(n).padStart(2, "0")}.${ext}`;
  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(path, buf, { contentType: type, upsert: true, cacheControl: "3600" });
  if (error) return null;
  await admin.from("assets").insert({ workspace_id: ws, kind: "photo", url: path, name: `${path.split("/").pop()}` });
  return path;
}

function frameRows(projectId: string, reel: ProjectWithFrames) {
  return reel.frames.map((f, i) => ({
    id: f.id || crypto.randomUUID(),
    project_id: projectId,
    sort_order: i,
    duration_sec: f.duration_sec,
    photo: f.photo,
    transition_in: f.transition_in,
    headline: f.headline,
    subline: f.subline,
    logo_visible: f.logo_visible,
    logo_variant: f.logo_variant ?? null,
    format_overrides: f.format_overrides ?? {},
  })) as never;
}

export async function insertReel(admin: Admin, ws: string, reel: ProjectWithFrames) {
  const { data, error } = await admin
    .from("projects")
    .insert({
      workspace_id: ws,
      name: reel.name,
      primary_format: reel.primary_format,
      formats: reel.formats,
      pace: reel.pace,
      logo: reel.logo,
      end_card: reel.end_card,
      template_id: reel.template_id ?? null,
    } as never)
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not save reel: ${error?.message}`);
  const { error: fe } = await admin.from("frames").insert(frameRows(data.id, reel));
  if (fe) throw new Error(`Could not save frames: ${fe.message}`);
  return data.id as string;
}

/** Replaces a reel's look and frames in place (template change). */
export async function replaceReel(admin: Admin, ws: string, id: string, reel: ProjectWithFrames) {
  const { error } = await admin
    .from("projects")
    .update({ pace: reel.pace, logo: reel.logo, end_card: reel.end_card, template_id: reel.template_id ?? null, primary_format: reel.primary_format, formats: reel.formats } as never)
    .eq("id", id)
    .eq("workspace_id", ws);
  if (error) throw new Error(error.message);
  const { error: de } = await admin.from("frames").delete().eq("project_id", id);
  if (de) throw new Error(de.message);
  const { error: fe } = await admin.from("frames").insert(frameRows(id, reel));
  if (fe) throw new Error(fe.message);
}

/** Loads a reel only if it belongs to this shop's workspace, with short-lived photo links. */
export async function loadReel(admin: Admin, ws: string, id: string) {
  const { data: project } = await admin.from("projects").select("*").eq("id", id).eq("workspace_id", ws).is("deleted_at", null).maybeSingle();
  if (!project) return null;
  const { data: frames } = await admin.from("frames").select("*").eq("project_id", id).order("sort_order");
  const paths = [...new Set((frames ?? []).map((f) => (f.photo as { path?: string })?.path).filter((p): p is string => !!p && p.startsWith(`${ws}/`)))];
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await admin.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  }
  const logo = (project.logo as { path?: string | null } | null)?.path;
  if (logo?.startsWith(`${BRAND_PREFIX}${ws}/`)) {
    const { data } = await admin.storage.from(BRAND_BUCKET).createSignedUrl(logo.slice(BRAND_PREFIX.length), 3600);
    if (data?.signedUrl) urls[logo] = data.signedUrl;
  }
  return { project: { ...project, frames: frames ?? [] } as unknown as ProjectWithFrames, urls };
}

export const PRODUCTS_QUERY = `query PickedProducts($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { id title handle onlineStoreUrl vendor productType priceRangeV2 { minVariantPrice { amount currencyCode } } variants(first: 1) { nodes { price } } media(first: 10) { nodes { ... on MediaImage { id alt image { url width height } } } } } } }`;

type Node = {
  id?: string;
  title?: string;
  priceRangeV2?: { minVariantPrice: { amount: string; currencyCode: string } } | null;
  variants?: { nodes: { price: string | null }[] } | null;
  media?: { nodes: { alt?: string | null; image?: { url: string } | null }[] };
} | null;

export async function gql<T>(shop: string, token: string, q: string, v?: unknown) {
  try {
    return await adminGraphql<T>(shop, token, q, v);
  } catch (e) {
    if (!/THROTTLED|429/.test(String(e))) throw e;
    await new Promise((r) => setTimeout(r, 1000));
    return adminGraphql<T>(shop, token, q, v);
  }
}

/** Picked products with photos and a real price (variant fallback when the range is empty or zero). */
export async function fetchProducts(shop: string, token: string, ids: string[]): Promise<PickedProduct[]> {
  const data = await gql<{ nodes: Node[] }>(shop, token, PRODUCTS_QUERY, { ids });
  return data.nodes.filter((n): n is NonNullable<Node> => !!n?.id).map((n) => {
    const range = n.priceRangeV2?.minVariantPrice ?? null;
    const price = productPrice(range, n.variants?.nodes?.[0]?.price ?? null, range?.currencyCode);
    if (!price || Number(price.amount) <= 0) console.info("shopify product has no price", n.id, JSON.stringify({ range, variants: n.variants }));
    return {
      id: n.id!,
      title: n.title ?? "",
      price,
      images: (n.media?.nodes ?? []).filter((m) => m.image?.url).map((m) => ({ url: m.image!.url, alt: m.alt ?? null })),
    };
  });
}
