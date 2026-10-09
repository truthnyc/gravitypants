/** Colour helpers for the Photo tab: palette sampling and hex input. */

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
export const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
const lum = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};

/** Median cut over RGBA pixels; returns up to `count` hex colours, darkest first. */
export function medianCut(data: ArrayLike<number>, count = 5): string[] {
  const px: [number, number, number][] = [];
  for (let i = 0; i + 3 < data.length; i += 4) if ((data[i + 3] ?? 0) > 127) px.push([data[i]!, data[i + 1]!, data[i + 2]!]);
  if (!px.length) return [];
  let boxes = [px];
  while (boxes.length < count) {
    let bi = -1, ch = 0, best = -1;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of b) { lo = Math.min(lo, p[c]!); hi = Math.max(hi, p[c]!); }
        if (hi - lo > best) { best = hi - lo; bi = i; ch = c; }
      }
    });
    if (bi < 0 || best <= 0) break;
    const b = [...boxes[bi]!].sort((a, z) => a[ch]! - z[ch]!);
    const mid = b.length >> 1;
    boxes = [...boxes.slice(0, bi), b.slice(0, mid), b.slice(mid), ...boxes.slice(bi + 1)];
  }
  const out = boxes.map((b) => {
    const s = b.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    return toHex(s[0] / b.length, s[1] / b.length, s[2] / b.length);
  });
  return [...new Set(out)].sort((a, b) => lum(a) - lum(b));
}

/** Accepts "abc", "#abc", "aabbcc" or "#AABBCC"; returns "#AABBCC" or null. */
export function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(v)) return `#${v.split("").map((c) => c + c).join("")}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v}`.toUpperCase();
  return null;
}

const cache = new Map<string, string[]>();
/** Samples a palette from a loaded image on a 64px downscale (cached per path). */
export function photoPalette(path: string | null | undefined, img: HTMLImageElement | undefined): string[] {
  if (!path || !img?.naturalWidth || typeof document === "undefined") return [];
  const hit = cache.get(path);
  if (hit) return hit;
  try {
    const s = 64 / Math.max(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    const ctx = c.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const out = medianCut(ctx.getImageData(0, 0, c.width, c.height).data, 5);
    cache.set(path, out);
    return out;
  } catch {
    return [];
  }
}

/** Friendly photo name: stored name, else the uploaded file name, never a hash. */
export function photoName(photo: { name?: string | null; path?: string | null }, index: number): string {
  const fallback = `Photo ${index + 1}`;
  const raw = photo.name?.trim() || (photo.path?.split("/").pop() ?? "").replace(/^[0-9a-f-]{36}-/i, "");
  const base = raw.replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  if (!base || /[0-9a-f]{16,}/i.test(base) || /^[0-9a-f-]{12,}$/i.test(base) || /^[0-9a-f]{8}-/i.test(base)) return fallback;
  return base;
}
