/* Pure rules for turning picked Shopify products into a reel. Used by the server routes and tests. */
import { DEFAULT_LOGO, type Format, type Frame, type LogoSettings, type ProjectWithFrames, type TextSettings } from "@/lib/stillframe/types";
import type { Template, TemplateFrame } from "@/lib/stillframe/data";
import { sourceFromTemplate } from "@/lib/stillframe/template-source";
import { MAX_SLIDES } from "@/lib/stillframe/template-doc";
import { refitForMainSize } from "@/lib/stillframe/main-size";
import { frameForFormat, patchTextForFormat, REEL_FORMATS } from "@/lib/stillframe/format-settings";

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
  const mid = d[Math.floor((d.length - 1) / 2)] ?? 2;
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

/** Artwork is shop-owned; layout is template-owned, including unspecified sizes. */
export function templateLogo(template: Template, path: string | null): LogoSettings {
  const own = template.settings.logo ?? {};
  const fallback = own.positions?.[template.settings.primary_format]
    ?? Object.values(own.positions ?? {}).find(Boolean)
    ?? template.style?.["logo_position"] ?? "top-right";
  return { ...DEFAULT_LOGO, ...own, path, light_path: null, dark_path: null,
    positions: Object.fromEntries(REEL_FORMATS.map((f) => [f, own.positions?.[f] ?? fallback])),
  };
}

export function withLogoImage(reel: ProjectWithFrames, path: string): ProjectWithFrames {
  return { ...reel, logo: { ...reel.logo, path, light_path: null, dark_path: null } };
}

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
    logo: templateLogo(template, o.logoPath ?? null),
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

export type SlideResult<T = ReelItem> = { items: T[]; error: string | null };

export function addSlides(items: ReelItem[], more: ReelItem[]): SlideResult {
  if (items.length + more.length > MAX_SLIDES) return { items, error: LIMIT_MESSAGE };
  return { items: [...items, ...more], error: null };
}
export function removeSlide<T>(items: T[], index: number): SlideResult<T> {
  if (items.length <= 1) return { items, error: "A reel needs at least one photo." };
  if (index < 0 || index >= items.length) return { items, error: null };
  return { items: items.filter((_, i) => i !== index), error: null };
}
export function moveSlide<T>(items: T[], from: number, to: number): SlideResult<T> {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return { items, error: null };
  const next = [...items];
  const [x] = next.splice(from, 1);
  if (x === undefined) return { items, error: null };
  next.splice(to, 0, x);
  return { items: next, error: null };
}

/** Makes `format` the reel's size using the editor's own re-fit rules; slides and words are kept. */
export function changeSize(reel: ProjectWithFrames, format: Format): ProjectWithFrames {
  const { frames, ...project } = reel;
  const positions = { ...reel.logo.positions, [format]: reel.logo.positions?.[format] ?? reel.logo.positions?.[reel.primary_format] ?? Object.values(reel.logo.positions ?? {}).find(Boolean) ?? "top-right" };
  const doc = refitForMainSize({ project, frames } as never, format, positions) as unknown as { project: Omit<ProjectWithFrames, "frames">; frames: Frame[] };
  return { ...doc.project, formats: [format], frames: doc.frames };
}

type OptionalPatch<T> = { [K in keyof T]?: T[K] | undefined };
export type TextStylePatch = OptionalPatch<Pick<TextSettings, "font_family" | "font_weight" | "size_px" | "color" | "position" | "animation" | "keep_under_headline">>;
export type StyleChange =
  | { element: "headline" | "subline"; scope: "all" | "slide"; index: number; patch: TextStylePatch }
  | { element: "logo"; patch: OptionalPatch<Pick<LogoSettings, "positions" | "size_pct" | "show_on" | "enabled" | "opacity">> };

export function applyReelStyle(reel: ProjectWithFrames, change: StyleChange): ProjectWithFrames {
  const format = reel.primary_format;
  if (change.element === "logo") {
    const clean = Object.fromEntries(Object.entries(change.patch).filter(([, v]) => v !== undefined)) as Partial<LogoSettings>;
    const logo = { ...reel.logo, ...clean };
    // Existing per-size overrides must not conceal the newly selected reel-wide settings.
    const overrides = { ...logo.format_overrides };
    if (overrides[format]) {
      const own = { ...overrides[format] };
      if (change.patch.size_pct !== undefined) delete own.size_pct;
      if (change.patch.show_on !== undefined) delete own.show_on;
      if (change.patch.opacity !== undefined) delete own.opacity;
      overrides[format] = own;
    }
    return { ...reel, logo: { ...logo, format_overrides: overrides } };
  }
  const { element, scope, index, patch } = change;
  return { ...reel, frames: reel.frames.map((f, i) => {
    if (scope !== "all" && i !== index) return f;
    // Keep each slide's words and visibility; style-only changes never create price text.
    const updated = patchTextForFormat(f, format, element, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<TextSettings>);
    return { ...updated, [element]: f[element] ? { ...updated[element], text: f[element]?.text } : updated[element] };
  }) };
}

/** The first slide represents the current reel-wide look; no new styling fields are stored. */
export function appendReelSlides(reel: ProjectWithFrames, more: ReelItem[]): { reel: ProjectWithFrames; error: string | null } {
  if (reel.frames.length + more.length > MAX_SLIDES) return { reel, error: LIMIT_MESSAGE };
  const source = reel.frames[0];
  if (!source) return { reel, error: "A reel needs at least one photo." };
  const visible = frameForFormat(source, reel.primary_format);
  const frames = more.map((item, i): Frame => ({
    ...structuredClone(source), id: crypto.randomUUID(), sort_order: reel.frames.length + i,
    photo: { ...source.photo, path: item.path, url: item.path, asset_id: null, shopify_product_id: item.productId ?? null } as Frame["photo"],
    duration_sec: Math.max(2, source.duration_sec - (source.headline?.delay_sec ?? 0)),
    headline: { ...visible.headline, text: item.headline, delay_sec: 0 },
    subline: item.subline ? { ...(visible.subline ?? visible.headline), text: item.subline, keep_under_headline: visible.subline?.keep_under_headline ?? true, delay_sec: 0 } : null,
    format_overrides: Object.fromEntries(Object.entries(source.format_overrides ?? {}).map(([size, own]) => [size, {
      ...own, photo: own.photo ? { ...own.photo, path: item.path, url: item.path, asset_id: null } : undefined,
      headline: own.headline ? { ...own.headline, text: item.headline, delay_sec: 0 } : undefined,
      subline: item.subline ? { ...own.subline, text: item.subline, delay_sec: 0 } : null,
    }])),
  }));
  return { reel: { ...reel, frames: [...reel.frames, ...frames] }, error: null };
}

export function resetReelStyle(reel: ProjectWithFrames, template: Template): ProjectWithFrames {
  const next = buildReel(template, itemsFromFrames(reel.frames), {
    workspaceId: reel.workspace_id, shopName: reel.end_card.cta_text ?? "", name: reel.name,
    format: reel.primary_format, logoPath: reel.logo.path ?? null, signoff: Boolean(reel.end_card.enabled),
  });
  return { ...reel, logo: next.logo, pace: next.pace, template_id: next.template_id ?? null,
    frames: next.frames.map((f, i) => ({ ...f, id: reel.frames[i]?.id ?? f.id, project_id: reel.id, photo: reel.frames[i]?.photo ?? f.photo })),
  };
}
