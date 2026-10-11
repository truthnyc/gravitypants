/* Pure rules for turning picked Shopify products into a reel. Used by the server routes and tests. */
import type { Format, Frame, ProjectWithFrames, TextSettings } from "@/lib/stillframe/types";
import type { Template, TemplateFrame } from "@/lib/stillframe/data";
import { sourceFromTemplate } from "@/lib/stillframe/template-source";
import { MAX_SLIDES } from "@/lib/stillframe/template-doc";
import { refitForMainSize } from "@/lib/stillframe/main-size";

export const MAX_PRODUCTS = 10;
export const MAX_FRAMES = MAX_SLIDES;
/** Sizes offered on the Shopify reel screen; 9:16 is the default. */
export const SHOPIFY_SIZES: Format[] = ["9:16", "4:5", "1:1", "16:9"];
/** The first photo is shown on its own for this long before its words appear. */
export const FIRST_PHOTO_LEAD = 0.8;
export const LIMIT_MESSAGE = `A reel can have up to ${MAX_SLIDES} photos. Remove one to add another.`;

export type PickedProduct = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string } | null;
  images: { url: string; alt: string | null }[];
};
/** One photo slot in the reel, with the words shown over it. */
export type ReelItem = { path: string; headline: string; subline: string | null; productId?: string | null };

/** Formatted price, or null when it's missing or zero (the subline is then hidden). */
export function formatPrice(p: PickedProduct["price"]): string | null {
  if (!p) return null;
  const n = Number(p.amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: p.currencyCode, minimumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `${p.amount} ${p.currencyCode}`;
  }
}

/** Uses the price range unless it's empty or zero, then the first variant's price. */
export function productPrice(
  range: { amount: string; currencyCode: string } | null | undefined,
  variantPrice: string | null | undefined,
  currency: string | null | undefined,
): PickedProduct["price"] {
  if (range && Number(range.amount) > 0) return range;
  if (variantPrice && Number(variantPrice) > 0) return { amount: variantPrice, currencyCode: range?.currencyCode ?? currency ?? "USD" };
  return range ?? null;
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

/** The template's usual slide length (median of its slides, at least 2s). */
export function normalDuration(template: Template) {
  const d = (template.settings.frames ?? []).map((f) => Number(f.duration_sec) || 0).filter((x) => x > 0).sort((a, b) => a - b);
  const mid = d.length ? d[Math.floor((d.length - 1) / 2)]! : 2;
  return Math.max(2, mid);
}

export type BuildOptions = {
  shopName: string;
  workspaceId: string;
  name: string;
  format?: Format;
  /** Brand kit logo (storage key), shown wherever the template shows a logo. */
  logoPath?: string | null;
  /** Sign-off slide; off unless the merchant turns it on. */
  signoff?: boolean;
};

/** Applies a template's look to the items. The sign-off slide is off by default. */
export function buildReel(template: Template, items: ReelItem[], o: BuildOptions): ProjectWithFrames {
  const base = sourceFromTemplate(template, Math.max(1, items.length), o.workspaceId, FALLBACK_FRAME);
  const normal = normalDuration(template);
  const frames: Frame[] = base.frames.map((f, i) => {
    const item = items[i];
    const h = (f.headline ?? FALLBACK_FRAME.headline) as TextSettings;
    const sub = (item?.subline
      ? { ...(f.subline ?? { ...h, size_px: Math.round((h.size_px ?? 96) * 0.55), keep_under_headline: true }), text: item.subline, same_on_all: false }
      : null) as TextSettings | null;
    const first = i === 0;
    return {
      ...f,
      duration_sec: Math.max(Number(f.duration_sec) || 0, normal) + (first ? FIRST_PHOTO_LEAD : 0),
      photo: { ...f.photo, path: item?.path ?? null, url: item?.path ?? null, asset_id: null, ...(item?.productId ? { shopify_product_id: item.productId } : {}) },
      headline: { ...h, text: item?.headline ?? "", same_on_all: false, ...(first ? { delay_sec: FIRST_PHOTO_LEAD } : {}) },
      subline: sub ? { ...sub, ...(first ? { delay_sec: FIRST_PHOTO_LEAD } : {}) } : null,
      format_overrides: {},
    };
  });
  const shop = o.shopName.trim();
  const reel: ProjectWithFrames = {
    ...base,
    name: o.name.slice(0, 80) || base.name,
    primary_format: "9:16",
    formats: ["9:16"],
    logo: { ...base.logo, path: o.logoPath ?? null, light_path: null, dark_path: null },
    end_card: { enabled: Boolean(o.signoff) && Boolean(shop), cta_text: shop, background: "last_photo" },
    frames,
  };
  return o.format && o.format !== "9:16" ? changeSize(reel, o.format) : reel;
}

/** Words and photos currently on a reel, so a template or slide change keeps them. */
export function itemsFromFrames(frames: Pick<Frame, "photo" | "headline" | "subline">[]): ReelItem[] {
  return frames.map((f) => ({
    path: f.photo?.path ?? "",
    headline: f.headline?.text ?? "",
    subline: f.subline?.text || null,
    productId: ((f.photo as { shopify_product_id?: string } | null)?.shopify_product_id) ?? null,
  }));
}

export type SlideResult = { items: ReelItem[]; error: string | null };

export function addSlides(items: ReelItem[], more: ReelItem[]): SlideResult {
  if (items.length + more.length > MAX_SLIDES) return { items, error: LIMIT_MESSAGE };
  return { items: [...items, ...more], error: null };
}
export function removeSlide(items: ReelItem[], index: number): SlideResult {
  if (items.length <= 1) return { items, error: "A reel needs at least one photo." };
  if (index < 0 || index >= items.length) return { items, error: null };
  return { items: items.filter((_, i) => i !== index), error: null };
}
export function moveSlide(items: ReelItem[], from: number, to: number): SlideResult {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return { items, error: null };
  const next = [...items];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return { items: next, error: null };
}

/** Makes `format` the reel's size using the editor's own re-fit rules; slides and words are kept. */
export function changeSize(reel: ProjectWithFrames, format: Format): ProjectWithFrames {
  const { frames, ...project } = reel;
  const doc = refitForMainSize({ project, frames } as never, format) as unknown as { project: Omit<ProjectWithFrames, "frames">; frames: Frame[] };
  return { ...doc.project, formats: [format], frames: doc.frames };
}
