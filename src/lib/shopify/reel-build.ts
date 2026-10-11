/* Pure rules for turning picked Shopify products into a reel. Used by the server routes and tests. */
import type { Frame, ProjectWithFrames, TextSettings } from "@/lib/stillframe/types";
import type { Template, TemplateFrame } from "@/lib/stillframe/data";
import { sourceFromTemplate } from "@/lib/stillframe/template-source";
import { MAX_SLIDES } from "@/lib/stillframe/template-doc";

export const MAX_PRODUCTS = 10;
export const MAX_FRAMES = MAX_SLIDES;

export type PickedProduct = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string } | null;
  images: { url: string; alt: string | null }[];
};
/** One photo slot in the reel, with the words shown over it. */
export type ReelItem = { path: string; headline: string; subline: string | null };

export function formatPrice(p: PickedProduct["price"]): string | null {
  if (!p) return null;
  const n = Number(p.amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: p.currencyCode, minimumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `${p.amount} ${p.currencyCode}`;
  }
}

/** Picked order; every product gets its first photo before any product gets a second. Max 10 frames. */
export function pickPhotos(products: PickedProduct[]): { product: PickedProduct; url: string }[] {
  const withImages = products.slice(0, MAX_PRODUCTS).filter((p) => p.images.length > 0);
  const out: { product: PickedProduct; url: string }[] = [];
  for (let round = 0; out.length < MAX_FRAMES; round++) {
    let added = false;
    for (const p of withImages) {
      const img = p.images[round];
      if (img && out.length < MAX_FRAMES) {
        out.push({ product: p, url: img.url });
        added = true;
      }
    }
    if (!added) break;
  }
  // Keep each product's photos together in picked order.
  return withImages.flatMap((p) => out.filter((o) => o.product === p));
}

const FALLBACK_FRAME: TemplateFrame = {
  duration_sec: 2,
  transition_in: { type: "fade", speed: "smooth" },
  photo: { fit: "fill", focus: { x: 0.5, y: 0.5 }, movement: "slow_zoom_in", brightness: 0, background: "blur" },
  headline: { text: "", size_px: 96, color: "#FFFFFF", animation: "rise", position: "bottom-center", same_on_all: false },
  subline: null,
  logo_visible: false,
  logo_variant: null,
  format_overrides: {},
};

/** Applies a template's look to the items; the shop name becomes the sign-off card. */
export function buildReel(template: Template, items: ReelItem[], shopName: string, workspaceId: string, name: string): ProjectWithFrames {
  const base = sourceFromTemplate(template, Math.max(1, items.length), workspaceId, FALLBACK_FRAME);
  const frames: Frame[] = base.frames.map((f, i) => {
    const item = items[i];
    const h = (f.headline ?? FALLBACK_FRAME.headline) as TextSettings;
    const sub: TextSettings | null = item?.subline
      ? { ...(f.subline ?? { ...h, size_px: Math.round(h.size_px * 0.55), animation: h.animation, keep_under_headline: true }), text: item.subline, same_on_all: false }
      : null;
    return {
      ...f,
      photo: { ...f.photo, path: item?.path ?? null, url: item?.path ?? null, asset_id: null },
      headline: { ...h, text: item?.headline ?? "", same_on_all: false },
      subline: sub,
      format_overrides: {},
    };
  });
  return {
    ...base,
    name: name.slice(0, 80) || base.name,
    primary_format: "9:16",
    formats: ["9:16"],
    end_card: { enabled: Boolean(shopName.trim()), cta_text: shopName.trim() },
    frames,
  };
}

/** Words currently on a reel, so a template change keeps them. */
export function itemsFromFrames(frames: Pick<Frame, "photo" | "headline" | "subline">[]): ReelItem[] {
  return frames.map((f) => ({ path: f.photo?.path ?? "", headline: f.headline?.text ?? "", subline: f.subline?.text || null }));
}
