/** Logo upload checks for the Logo tab: type/size rules, trimming, light/dark detection. */
import { sanitizeLogoFile } from "./svg-safety";

export const LOGO_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file may be uploaded. */
export function logoFileError(file: { type: string; size: number; name: string }): string | null {
  const typeOk = LOGO_TYPES.includes(file.type) || /\.(png|svg|jpe?g|webp)$/i.test(file.name);
  if (!typeOk) return "Use a PNG, SVG, JPG or WebP file.";
  if (file.size > LOGO_MAX_BYTES) return "That file is over 5 MB. Try a smaller one.";
  return null;
}

/** Light artwork = average brightness of opaque pixels above the midpoint. */
export function isLightArtwork(data: ArrayLike<number>): boolean {
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < 128) continue;
    sum += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    n++;
  }
  return n > 0 && sum / n > 150;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export type PreparedLogo = { file: File; light: boolean; warning: string | null };

/** Trims transparent edges of raster logos, detects light/dark and flags small or opaque artwork. */
export async function prepareLogo(file: File): Promise<PreparedLogo> {
  file = await sanitizeLogoFile(file);
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || 600;
    const h = img.naturalHeight || 200;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = false;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3]!;
        if (a < 250) transparent = true;
        if (a > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    const light = isLightArtwork(data);
    const warnings: string[] = [];
    if (!isSvg && Math.max(w, h) < 300) warnings.push("This logo is small and may look soft.");
    if (!transparent) warnings.push("This logo has no see-through background, so a box may show behind it.");
    let out = file;
    if (!isSvg && x1 >= 0 && (x0 > 0 || y0 > 0 || x1 < w - 1 || y1 < h - 1)) {
      const t = document.createElement("canvas");
      t.width = x1 - x0 + 1;
      t.height = y1 - y0 + 1;
      t.getContext("2d")!.drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
      const blob = await new Promise<Blob | null>((r) => t.toBlob(r, "image/png"));
      if (blob) out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
    }
    return { file: out, light, warning: warnings.join(" ") || null };
  } catch {
    return { file, light: false, warning: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Makes an all-white or all-black copy of a logo, keeping its shape. */
export async function monoLogo(src: string, color: "white" | "black", name: string): Promise<File> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 600;
  c.height = img.naturalHeight || 200;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color === "white" ? "#FFFFFF" : "#000000";
  ctx.fillRect(0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Couldn't make that version");
  return new File([blob], `${name}-${color}.png`, { type: "image/png" });
}

/** Picks up to four weights for the Weight control, preferring common ones. */
export function weightChoices(ws: number[]): number[] {
  if (ws.length <= 4) return ws;
  const pref = [300, 400, 600, 700, 500, 800, 200, 900, 100];
  return pref.filter((w) => ws.includes(w)).slice(0, 4).sort((a, b) => a - b);
}
