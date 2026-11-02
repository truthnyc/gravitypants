import type { PhotoSettings } from "./types";

export const SCALE_MIN = 50;
export const SCALE_MAX = 200;
export const OFFSET_MAX = 60;

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Photo scale in percent (50–200). Falls back to the legacy `zoom` multiplier. */
export function photoScale(photo: PhotoSettings | undefined): number {
  const p = photo ?? {};
  if (typeof p.scale === "number") return clampN(Math.round(p.scale), SCALE_MIN, SCALE_MAX);
  return clampN(Math.round((Number(p.zoom ?? 1) || 1) * 100), SCALE_MIN, SCALE_MAX);
}

/**
 * Offset of the photo's centre from the frame centre, as % of frame width/height (±60).
 * Legacy frames stored a Crop & focus point; with image + frame size it converts exactly
 * to the position the old renderer drew, otherwise it approximates.
 */
export function photoOffset(
  photo: PhotoSettings | undefined,
  dims?: { iw: number; ih: number; W: number; H: number },
): { x: number; y: number } {
  const p = photo ?? {};
  if (typeof p.offset_x === "number" || typeof p.offset_y === "number") {
    return { x: clampN(Number(p.offset_x ?? 0), -OFFSET_MAX, OFFSET_MAX), y: clampN(Number(p.offset_y ?? 0), -OFFSET_MAX, OFFSET_MAX) };
  }
  const fx = p.focus?.x ?? 0.5;
  const fy = p.focus?.y ?? 0.5;
  if ((p.fit ?? "fill") !== "fill" || (fx === 0.5 && fy === 0.5)) return { x: 0, y: 0 };
  if (!dims) return { x: (0.5 - fx) * 40, y: (0.5 - fy) * 40 };
  const { iw, ih, W, H } = dims;
  const sc = Math.max(W / iw, H / ih) * (photoScale(p) / 100);
  const dw = iw * sc, dh = ih * sc;
  const x = dw < W ? (W - dw) / 2 : clampN(W / 2 - fx * dw, W - dw, 0);
  const y = dh < H ? (H - dh) / 2 : clampN(H / 2 - fy * dh, H - dh, 0);
  return {
    x: clampN(((x + dw / 2 - W / 2) / W) * 100, -OFFSET_MAX, OFFSET_MAX),
    y: clampN(((y + dh / 2 - H / 2) / H) * 100, -OFFSET_MAX, OFFSET_MAX),
  };
}

export const clampScale = (v: number) => clampN(Math.round(v), SCALE_MIN, SCALE_MAX);
export const clampOffset = (v: number) => clampN(v, -OFFSET_MAX, OFFSET_MAX);

/** True when the photo was scaled or moved away from the default framing. */
export function isReframed(photo: PhotoSettings | undefined): boolean {
  const o = photoOffset(photo);
  return photoScale(photo) !== 100 || Math.abs(o.x) > 0.01 || Math.abs(o.y) > 0.01;
}

/** Patch that resets framing to 100%, centred (also clears legacy fields). */
export const RESET_FRAMING: Partial<PhotoSettings> = { scale: 100, offset_x: 0, offset_y: 0, zoom: 1, focus: { x: 0.5, y: 0.5 } };
