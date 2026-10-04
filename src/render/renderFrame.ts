import type {
  EndCard,
  Format,
  Frame,
  Project,
  TextSettings,
  TransitionSettings,
} from "@/lib/stillframe/types";
import { safeRect, type Rect } from "./formats";

export const DEFAULT_FONT = "DM Sans";

export type RenderOptions = {
  width: number;
  height: number;
  showGuides?: boolean;
  /** Loaded images keyed by storage path. */
  images?: Map<string, HTMLImageElement>;
  /** Brand Kit look for the end card (first color, body font, fallback end card settings). */
  brand?: BrandStyle | undefined;
  /** Free-trial exports carry a small "Made with Gravity Pants" mark. */
  watermark?: boolean;
};

export type BrandStyle = { color?: string | null; font?: string | null; endCard?: EndCard | null };

export const END_CARD_SECONDS = 1.5;
const END_CARD_FADE = 0.6;
const END_CARD_FALLBACK = "#1D1D1F";

/** The end card in effect: the ad's own setting wins, otherwise the Brand Kit's. */
export function endCardOf(project: Project, brand?: BrandStyle) {
  const own = project.end_card ?? {};
  const kit = brand?.endCard ?? {};
  const enabled = own.enabled ?? kit.enabled ?? false;
  const cta = (own.cta_text || kit.cta_text || "").trim();
  return { enabled: Boolean(enabled), cta };
}

/** Full video length including the end card, matching what export produces. */
export function videoDuration(project: Project, frames: Frame[], brand?: BrandStyle) {
  if (!frames.length) return 0;
  return totalDuration(frames) + (endCardOf(project, brand).enabled ? END_CARD_SECONDS : 0);
}

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const ANCHORS: Anchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export function anchorParts(anchor: string | undefined | null): { col: number; row: number } {
  const index = ANCHORS.indexOf((anchor ?? "center") as Anchor);
  const i = index < 0 ? 4 : index;
  return { col: i % 3, row: Math.floor(i / 3) };
}

/** Target point of an anchor inside the safe rect (used for drag snapping). */
export function anchorPoint(anchor: Anchor, safe: Rect) {
  const { col, row } = anchorParts(anchor);
  return { x: safe.x + (safe.w * col) / 2, y: safe.y + (safe.h * row) / 2 };
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const dur = (f: Frame | undefined) => Math.max(0.1, Number(f?.duration_sec ?? 2.5));

export function transitionDuration(tr?: TransitionSettings | null) {
  if (!tr || tr.type === "cut") return 0;
  return tr.speed === "quick" ? 0.3 : 0.6;
}

/** Incoming transition length for frame j, clamped so it never exceeds either neighbour. */
function incoming(frames: Frame[], j: number) {
  if (j <= 0) return 0;
  return Math.min(transitionDuration(frames[j]?.transition_in), dur(frames[j - 1]), dur(frames[j]));
}

export function frameStarts(frames: Frame[]) {
  let acc = 0;
  return frames.map((f) => {
    const s = acc;
    acc += dur(f);
    return s;
  });
}

export function totalDuration(frames: Frame[]) {
  return frames.reduce((s, f) => s + dur(f), 0);
}

export function frameIndexAt(frames: Frame[], t: number) {
  const starts = frameStarts(frames);
  let index = 0;
  for (let i = 0; i < starts.length; i++) if ((starts[i] ?? 0) <= t) index = i;
  return index;
}

/** A calm moment inside a frame to show while editing (text animated in, no transition). */
export function restTime(frames: Frame[], i: number) {
  const start = frameStarts(frames)[i] ?? 0;
  const next = incoming(frames, i + 1);
  return start + clamp(0.6, 0, Math.max(0, dur(frames[i]) - next - 0.05));
}

/* ------------------------------------------------------------------ layout */

export type Box = { x: number; y: number; w: number; h: number };
export type TextBlock = Box & {
  lines: string[];
  fontPx: number;
  lineH: number;
  align: CanvasTextAlign;
  font: string;
  color: string;
  animation: NonNullable<TextSettings["animation"]>;
};
export type FrameLayout = {
  safe: Rect;
  headline: TextBlock | null;
  subline: TextBlock | null;
  logo: (Box & { path: string }) | null;
};

export function fontFamilyOf(t: TextSettings | null | undefined) {
  return t?.font_family || DEFAULT_FONT;
}

function fontString(t: TextSettings, px: number, fallbackWeight: number) {
  return `${t.font_weight ?? fallbackWeight} ${px}px "${fontFamilyOf(t)}", sans-serif`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function measure(
  ctx: CanvasRenderingContext2D,
  t: TextSettings,
  W: number,
  safe: Rect,
  defaults: { size: number; weight: number; lineH: number },
) {
  const fontPx = ((t.size_px ?? defaults.size) * W) / 1080;
  const font = fontString(t, fontPx, defaults.weight);
  ctx.font = font;
  const maxW = Math.min(W * 0.84, safe.w);
  const lines = wrap(ctx, t.text ?? "", maxW);
  const width = Math.min(maxW, Math.max(1, ...lines.map((l) => ctx.measureText(l).width)));
  const lineH = fontPx * defaults.lineH;
  return { fontPx, font, lines, w: width, h: lines.length * lineH, lineH };
}

function place(col: number, row: number, w: number, h: number, safe: Rect) {
  return {
    x: safe.x + ((safe.w - w) * col) / 2,
    y: safe.y + ((safe.h - h) * row) / 2,
  };
}

const ALIGN: CanvasTextAlign[] = ["left", "center", "right"];

function logoPathFor(project: Project) {
  const l = project.logo;
  return l.path ?? l.light_path ?? l.dark_path ?? null;
}

function logoShown(project: Project, frame: Frame, index: number, count: number) {
  const on = project.logo.show_on ?? "all";
  if (on === "first_last") return index === 0 || index === count - 1;
  if (on === "selected") return frame.logo_visible;
  return true;
}

export function layoutFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frames: Frame[],
  index: number,
  format: Format,
  W: number,
  H: number,
  images?: Map<string, HTMLImageElement>,
): FrameLayout {
  const frame = frames[index];
  const safe = safeRect(format, W, H);
  const result: FrameLayout = { safe, headline: null, subline: null, logo: null };
  if (!frame) return result;

  const h = frame.headline?.text?.trim() ? frame.headline : null;
  const s = frame.subline?.text?.trim() ? frame.subline : null;
  const hm = h ? measure(ctx, h, W, safe, { size: 108, weight: 700, lineH: 1.08 }) : null;
  const sm = s ? measure(ctx, s, W, safe, { size: 48, weight: 500, lineH: 1.25 }) : null;

  const block = (
    t: TextSettings,
    m: NonNullable<typeof hm>,
    col: number,
    x: number,
    y: number,
  ): TextBlock => ({
    x,
    y,
    w: m.w,
    h: m.h,
    lines: m.lines,
    fontPx: m.fontPx,
    lineH: m.lineH,
    font: m.font,
    align: ALIGN[col] ?? "center",
    color: t.color ?? "#FFFFFF",
    animation: t.animation ?? "none",
  });

  if (h && hm) {
    const { col, row } = anchorParts(h.position);
    const stacked = s && sm && s.keep_under_headline;
    const gap = sm ? sm.fontPx * 0.45 : 0;
    const groupW = stacked ? Math.max(hm.w, sm.w) : hm.w;
    const groupH = stacked ? hm.h + gap + sm.h : hm.h;
    const p = place(col, row, groupW, groupH, safe);
    const alignX = (w: number) => p.x + ((groupW - w) * col) / 2;
    result.headline = block(h, hm, col, alignX(hm.w), p.y);
    if (stacked && s && sm) result.subline = block(s, sm, col, alignX(sm.w), p.y + hm.h + gap);
  }
  if (s && sm && !result.subline) {
    const { col, row } = anchorParts(s.position ?? "bottom-center");
    const p = place(col, row, sm.w, sm.h, safe);
    result.subline = block(s, sm, col, p.x, p.y);
  }

  const path = logoPathFor(project);
  if (path && logoShown(project, frame, index, frames.length)) {
    const img = images?.get(path);
    const w = ((project.logo.size_pct ?? 16) / 100) * W;
    const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const lh = w * ratio;
    const { col, row } = anchorParts(project.logo.frame_positions?.[frame.id]?.[format] ?? project.logo.positions?.[format] ?? "top-right");
    const p = place(col, row, w, lh, safe);
    result.logo = { ...p, w, h: lh, path };
  }
  return result;
}

/* ----------------------------------------------------------------- drawing */

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  W: number,
  H: number,
  u: number,
  images?: Map<string, HTMLImageElement>,
) {
  const photo = frame.photo ?? {};
  ctx.fillStyle = photo.background_color || "#2C2C2E";
  ctx.fillRect(0, 0, W, H);
  const img = photo.path ? images?.get(photo.path) : undefined;
  if (!img || !img.naturalWidth) return;

  const e = easeInOut(clamp(u));
  const mv = photo.movement ?? "none";
  const intensity = photo.movement_intensity ?? "standard";
  const zoomTravel = intensity === "subtle" ? 0.04 : intensity === "dramatic" ? 0.14 : 0.08;
  const panTravel = intensity === "subtle" ? 0.03 : intensity === "dramatic" ? 0.1 : 0.06;
  let zoom = 1;
  let pan = 0;
  let panV = 0;
  if (mv === "slow_zoom_in") zoom = 1 + zoomTravel * e;
  if (mv === "slow_zoom_out") zoom = 1 + zoomTravel - zoomTravel * e;
  if (mv === "pan_left" || mv === "pan_right") {
    zoom = 1 + panTravel + 0.01;
    pan = (mv === "pan_left" ? -1 : 1) * panTravel * W * (e - 0.5);
  }
  if (mv === "custom") {
    const zs = Math.max(1, Math.min(1.5, Number(photo.zoom_start ?? 1)));
    const ze = Math.max(1, Math.min(1.5, Number(photo.zoom_end ?? 1)));
    const px = Math.max(-1, Math.min(1, Number(photo.pan_x ?? 0)));
    const py = Math.max(-1, Math.min(1, Number(photo.pan_y ?? 0)));
    const travel = 0.12;
    // headroom so panning never reveals the background edge
    const pad = Math.max(Math.abs(px), Math.abs(py)) * (travel + 0.01);
    zoom = zs + (ze - zs) * e + pad;
    pan = px * travel * W * (e - 0.5);
    panV = py * travel * H * (e - 0.5);
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const fill = (photo.fit ?? "fill") === "fill";
  const base = fill ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  const sc = base * zoom * (fill ? Math.max(1, photo.zoom ?? 1) : 1);
  const dw = iw * sc;
  const dh = ih * sc;
  let x: number;
  let y: number;
  if (fill) {
    const fx = photo.focus?.x ?? 0.5;
    const fy = photo.focus?.y ?? 0.5;
    x = clamp(W / 2 - fx * dw, W - dw, 0);
    y = clamp(H / 2 - fy * dh, H - dh, 0);
  } else {
    x = (W - dw) / 2;
    y = (H - dh) / 2;
  }
  const b = clamp(Number(photo.brightness ?? 0) || 0, -1, 1);
  ctx.drawImage(img, x + pan, y + panV, dw, dh);
  // Brightness without ctx.filter (unsupported in Safari): result = img * (1 + b).
  if (b) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + pan, y + panV, dw, dh);
    ctx.clip();
    if (b > 0) {
      ctx.globalCompositeOperation = "lighter";
      // Multiply so the overlay also respects a transition's fade alpha.
      ctx.globalAlpha *= b;
      ctx.drawImage(img, x + pan, y + panV, dw, dh);
    } else {
      ctx.globalAlpha *= -b;
      ctx.fillStyle = "#000";
      ctx.fillRect(x + pan, y + panV, dw, dh);
    }
    ctx.restore();
  }
}

function drawText(ctx: CanvasRenderingContext2D, b: TextBlock, localT: number, H: number) {
  const p = clamp(localT / 0.5);
  const e = easeOut(p);
  ctx.save();
  let alpha = 1;
  if (b.animation === "rise") {
    alpha = e;
    ctx.translate(0, (1 - e) * 0.04 * H);
  } else if (b.animation === "fade") alpha = e;
  else if (b.animation === "pop") {
    alpha = e;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const s = 0.9 + 0.1 * e;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  }
  ctx.globalAlpha *= alpha;
  ctx.font = b.font;
  ctx.fillStyle = b.color;
  ctx.textAlign = b.align;
  ctx.textBaseline = "alphabetic";

  let remaining = Infinity;
  if (b.animation === "typewriter") {
    const total = b.lines.reduce((n, l) => n + l.length, 0);
    remaining = Math.floor(p * total);
  }
  const ax = b.align === "left" ? b.x : b.align === "right" ? b.x + b.w : b.x + b.w / 2;
  b.lines.forEach((line, i) => {
    if (remaining <= 0) return;
    const shown = line.slice(0, remaining);
    remaining -= line.length;
    const baseline = b.y + i * b.lineH + b.lineH * 0.5 + b.fontPx * 0.35;
    ctx.fillText(shown, ax, baseline);
  });
  ctx.restore();
}

function averageLuma(ctx: CanvasRenderingContext2D, box: Box) {
  try {
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.max(1, Math.floor(box.w));
    const h = Math.max(1, Math.floor(box.h));
    const d = ctx.getImageData(x, y, w, h).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) {
      sum += 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0);
      n++;
    }
    return n ? sum / n / 255 : 0;
  } catch {
    return 0;
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frames: Frame[],
  j: number,
  localT: number,
  format: Format,
  W: number,
  H: number,
  images?: Map<string, HTMLImageElement>,
) {
  const frame = frames[j];
  if (!frame) return;
  const span = dur(frame) + incoming(frames, j);
  drawPhoto(ctx, frame, W, H, localT / span, images);

  const layout = layoutFrame(ctx, project, frames, j, format, W, H, images);
  const texts = [layout.headline, layout.subline].filter(Boolean) as TextBlock[];

  if (frame.photo?.darken_for_text && texts.length) {
    const pad = W * 0.04;
    const x0 = Math.min(...texts.map((t) => t.x)) - pad;
    const y0 = Math.min(...texts.map((t) => t.y)) - pad;
    const x1 = Math.max(...texts.map((t) => t.x + t.w)) + pad;
    const y1 = Math.max(...texts.map((t) => t.y + t.h)) + pad;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  if (layout.logo) {
    const l = project.logo;
    let path = layout.logo.path;
    const variant = frame.logo_variant ?? l.version ?? "auto";
    if (variant === "auto" && l.light_path && l.dark_path) {
      path = averageLuma(ctx, layout.logo) > 0.55 ? l.dark_path : l.light_path;
    } else if (variant === "light" && l.light_path) path = l.light_path;
    else if (variant === "dark" && l.dark_path) path = l.dark_path;
    const img = images?.get(path);
    if (img && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha *= l.opacity === "soft" ? 0.7 : 1;
      ctx.drawImage(img, layout.logo.x, layout.logo.y, layout.logo.w, layout.logo.h);
      ctx.restore();
    }
  }

  for (const t of texts) drawText(ctx, t, localT, H);
}

/** Draws exactly what the viewer sees at timeSec. Pure: the same call serves preview and export. */
export function renderAt(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frames: Frame[],
  format: Format,
  timeSec: number,
  { width: W, height: H, showGuides, images, brand, watermark }: RenderOptions,
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (!frames.length) {
    ctx.restore();
    return;
  }

  const starts = frameStarts(frames);
  const framesEnd = totalDuration(frames);
  const endCard = endCardOf(project, brand);
  const endT = endCard.enabled ? timeSec - framesEnd : -1;
  const t = clamp(timeSec, 0, Math.max(0, framesEnd - 0.0001));
  const i = frameIndexAt(frames, t);
  const localOf = (j: number) => t - (starts[j] ?? 0) + incoming(frames, j);
  const layer = (j: number) => drawFrame(ctx, project, frames, j, localOf(j), format, W, H, images);

  const d = incoming(frames, i + 1);
  const end = (starts[i] ?? 0) + dur(frames[i]);
  if (i + 1 < frames.length && d > 0 && t >= end - d) {
    const p = clamp((t - (end - d)) / d);
    const type = frames[i + 1]?.transition_in?.type ?? "fade";
    const e = easeInOut(p);
    if (type === "dip_black") {
      layer(p < 0.5 ? i : i + 1);
      ctx.fillStyle = `rgba(0,0,0,${p < 0.5 ? p * 2 : (1 - p) * 2})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      layer(i);
      ctx.save();
      if (type === "fade") ctx.globalAlpha = e;
      if (type === "slide") ctx.translate((1 - e) * W, 0);
      if (type === "zoom") {
        const s = 1.1 - 0.1 * e;
        ctx.globalAlpha = e;
        ctx.translate(W / 2, H / 2);
        ctx.scale(s, s);
        ctx.translate(-W / 2, -H / 2);
      }
      if (type === "wipe") {
        ctx.beginPath();
        ctx.rect(0, 0, e * W, H);
        ctx.clip();
      }
      layer(i + 1);
      ctx.restore();
    }
  } else {
    layer(i);
  }

  if (endT >= 0) {
    ctx.save();
    ctx.globalAlpha = easeInOut(clamp(endT / END_CARD_FADE));
    drawEndCard(ctx, project, endCard.cta, brand, W, H, images);
    ctx.restore();
  }

  if (watermark) {
    // Centered Gravity Pants mark (same shapes as public/favicon.svg, 24-unit grid), drawn as paths so export never waits on an image.
    const size = Math.min(W, H) * 0.22;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate((W - size) / 2, (H - size) / 2);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = "#0071E3";
    ctx.beginPath();
    ctx.roundRect(0, 0, 24, 24, 5.4);
    ctx.fill();
    ctx.translate(0.75, 1.65);
    ctx.scale(0.9, 0.9);
    ctx.fillStyle = "#FFFFFF";
    const mark = new Path2D();
    mark.arc(11, 13, 7, 0, Math.PI * 2);
    mark.moveTo(9.7, 9.85);
    mark.lineTo(14.7, 13);
    mark.lineTo(9.7, 16.15);
    mark.closePath();
    ctx.fill(mark, "evenodd");
    ctx.beginPath();
    ctx.arc(19, 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const label = "Made with Gravity Pants";
    const fs = Math.max(12, Math.round(W * 0.032));
    ctx.save();
    ctx.font = `600 ${fs}px ${DEFAULT_FONT}, sans-serif`;
    const bw = ctx.measureText(label).width + fs * 1.4;
    const bh = fs * 1.9;
    const x = (W - bw) / 2;
    const y = H - bh - H * 0.04;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2, y + bh / 2 + fs * 0.05);
    ctx.restore();
  }


  if (showGuides) {
    const s = safeRect(format, W, H);
    ctx.setLineDash([W * 0.01, W * 0.01]);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, W / 540);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  }
  ctx.restore();
}

function hexLuma(color: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function drawEndCard(
  ctx: CanvasRenderingContext2D,
  project: Project,
  cta: string,
  brand: BrandStyle | undefined,
  W: number,
  H: number,
  images?: Map<string, HTMLImageElement>,
) {
  const bg = brand?.color || END_CARD_FALLBACK;
  const light = hexLuma(bg) > 0.55;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const l = project.logo;
  const path = (light ? l.dark_path || l.path || l.light_path : l.light_path || l.path || l.dark_path) ?? null;
  const img = path ? images?.get(path) : undefined;
  const logoW = W * 0.3;
  const logoH = img && img.naturalWidth ? (logoW * img.naturalHeight) / img.naturalWidth : 0;

  const fontPx = (48 * W) / 1080;
  const lineH = fontPx * 1.25;
  const family = brand?.font || DEFAULT_FONT;
  ctx.font = `600 ${fontPx}px "${family}", sans-serif`;
  const lines = cta ? wrap(ctx, cta, W * 0.84) : [];
  const gap = logoH && lines.length ? H * 0.04 : 0;
  const blockH = logoH + gap + lines.length * lineH;
  let y = (H - blockH) / 2;

  if (img && logoH) {
    ctx.drawImage(img, (W - logoW) / 2, y, logoW, logoH);
    y += logoH + gap;
  }
  ctx.fillStyle = light ? "#1D1D1F" : "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * lineH + lineH * 0.5 + fontPx * 0.35));
}

/* ------------------------------------------------------------ preparation */

/** Awaits every font the frames use so canvas text never falls back. */
export async function ensureFonts(frames: Frame[], brand?: BrandStyle) {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs = new Set<string>();
  for (const f of frames) {
    if (f.headline?.text) specs.add(`${f.headline.font_weight ?? 700}|${fontFamilyOf(f.headline)}`);
    if (f.subline?.text) specs.add(`${f.subline.font_weight ?? 500}|${fontFamilyOf(f.subline)}`);
  }
  specs.add(`600|${brand?.font || DEFAULT_FONT}`);
  const { loadFont } = await import("@/lib/stillframe/fonts");
  await Promise.all(
    [...specs].map((s) => {
      const [w, family] = s.split("|");
      return loadFont(family!, Number(w));
    }),
  );
}

export function mediaPaths(project: Project, frames: Frame[]) {
  const paths = new Set<string>();
  for (const f of frames) if (f.photo?.path) paths.add(f.photo.path);
  for (const p of [project.logo.path, project.logo.light_path, project.logo.dark_path])
    if (p) paths.add(p);
  return [...paths];
}
