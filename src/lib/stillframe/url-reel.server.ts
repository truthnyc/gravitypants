/* "Create from a product link": reads the page, saves its photos to the workspace and writes three drafts.
   One entry point (draftReelsFromUrl) so the app and, later, the MCP connector share it. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { gatewayText } from "@/lib/ai/gateway.server";
import { fetchProductInfo, ProductFetchError, safeFetchBytes } from "@/lib/directory/product-fetch.server";
import { productImages } from "@/lib/directory/product-page";
import type { Format } from "./types";
import {
  DRAFT_COUNT, FRAMES_PER_DRAFT, MAX_PRODUCT_PHOTOS, framePhotos, parseStories, pickDraftTemplates, priceLine,
  type DraftProduct, type ReelDraft,
} from "./url-reel";

export type DraftPhoto = { assetId: string; path: string; width: number; height: number; name: string };
export type UrlDraftResult =
  | { ok: true; product: DraftProduct; photos: DraftPhoto[]; drafts: ReelDraft[] }
  | { ok: false; error: string };

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function pageImages(url: string): Promise<string[]> {
  const { safeFetchText } = await import("@/lib/directory/product-fetch.server");
  const { text, url: final } = await safeFetchText(url, { timeoutMs: 8000, maxBytes: 2 * 1024 * 1024, accept: "text/html,application/xhtml+xml" });
  return productImages(text, final);
}

/** Downloads and stores up to three product photos under `<ws>/photo/`, with asset rows, as the caller (RLS applies). */
async function savePhotos(db: SupabaseClient, ws: string, urls: string[]): Promise<DraftPhoto[]> {
  const out: DraftPhoto[] = [];
  for (const [i, u] of urls.entries()) {
    if (out.length >= MAX_PRODUCT_PHOTOS) break;
    try {
      const { bytes, type } = await safeFetchBytes(u, { timeoutMs: 8000, maxBytes: 15 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", truncate: false });
      const ext = IMAGE_TYPES[type];
      if (!ext || bytes.byteLength < 2000) continue;
      const name = `product-${i + 1}.${ext}`;
      const path = `${ws}/photo/${crypto.randomUUID()}-${name}`;
      const { error } = await db.storage.from("media").upload(path, bytes, { contentType: type, cacheControl: "3600", upsert: false });
      if (error) continue;
      const { data: asset } = await db.from("assets").insert({ workspace_id: ws, kind: "photo", url: path, width: 0, height: 0, name }).select("id").single();
      if (!asset) continue;
      out.push({ assetId: asset.id as string, path, width: 0, height: 0, name });
    } catch { /* skip photos that can't be read */ }
  }
  return out;
}

async function writeStories(product: DraftProduct, brand: string, format: Format, angles: string[], imageUrl: string | null) {
  const price = priceLine(product.price, product.currency);
  const system = [
    `You write ${DRAFT_COUNT} different short social video ads for one product. Each ad has exactly ${FRAMES_PER_DRAFT} frames.`,
    "Frame 1 is a hook, frame 2 a detail or feeling, frame 3 the product name and a call to shop.",
    "Headlines 2 to 6 words, sublines 0 to 10 words. Plain, warm, confident. No emoji, hashtags or quotation marks.",
    price ? `Put the price ${price} in the subline of frame 3.` : "Never mention a price.",
    "Never invent discounts, materials, awards or facts that are not visible in the photo or given below.",
    `Give each ad its own angle, in this order: ${angles.join(", ")}.`,
    'Reply with JSON only: {"drafts":[{"angle":"...","frames":[{"headline":"...","subline":"..."}]}]}',
  ].join("\n");
  const lines = `Brand: ${brand}\nProduct: ${product.name}\nAd size: ${format}${imageUrl ? "\nThe product photo is attached." : ""}`;
  const content = imageUrl ? [{ type: "text" as const, text: lines }, { type: "image" as const, image: new URL(imageUrl) }] : lines;
  try { return parseStories(await gatewayText(system, [{ role: "user", content }]), product); }
  catch { return parseStories("", product); }
}

export async function draftReelsFromUrl(db: SupabaseClient, input: { workspaceId: string; url: string; format: Format }): Promise<UrlDraftResult> {
  const ws = input.workspaceId;
  let info;
  let images: string[];
  try {
    info = await fetchProductInfo(input.url);
    images = await pageImages(input.url);
  } catch (e) {
    return { ok: false, error: e instanceof ProductFetchError ? e.message : "We couldn't read that page." };
  }
  if (!info.name) return { ok: false, error: "We couldn't find a product on that page." };
  if (info.image_url && !images.includes(info.image_url)) images.unshift(info.image_url);
  const product: DraftProduct = { name: info.name, price: info.price, currency: info.currency, url: info.url };

  const [{ data: tpl }, { data: w }] = await Promise.all([
    db.from("templates").select("id, name, format, featured, source, status, sort_order")
      .or(`workspace_id.eq.${ws},visibility.eq.global,source.eq.system`).order("sort_order", { ascending: true }),
    db.from("workspaces").select("name").eq("id", ws).maybeSingle(),
  ]);
  const templates = pickDraftTemplates((tpl ?? []) as never[], input.format) as { id: string; name: string }[];
  if (!templates.length) return { ok: false, error: "No templates fit this size yet. Pick another size." };

  const photos = await savePhotos(db, ws, images);
  if (!photos.length) return { ok: false, error: "We couldn't download photos from that page." };

  const { data: signed } = await db.storage.from("media").createSignedUrl(photos[0]!.path, 600);
  const angles = ["Bold and direct", "Calm and sensory", "Playful"].slice(0, templates.length);
  const stories = await writeStories(product, (w?.name as string) ?? "the brand", input.format, angles, signed?.signedUrl ?? null);
  const order = framePhotos(photos.length);
  const drafts: ReelDraft[] = templates.map((t, i) => ({
    templateId: t.id,
    templateName: t.name,
    angle: stories[i]!.angle,
    slides: stories[i]!.lines.map(([headline, subline], f) => ({ photo: order[(f + i) % order.length]!, headline, subline })),
  }));
  return { ok: true, product, photos, drafts };
}
