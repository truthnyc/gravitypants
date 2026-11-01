/**
 * HTML5 banner export: a zip with index.html, the bundled renderAt player (ad.js),
 * resized images and the exact font files, so the banner plays exactly like the preview.
 */
import { zipSync, strToU8 } from "fflate";
import runtimeJs from "virtual:html5-runtime";
import type { CustomFont } from "@/lib/stillframe/types";
import { allFormatFrames, projectForFormat, REEL_FORMATS } from "@/lib/stillframe/format-settings";
import { getMediaUrl } from "@/lib/stillframe/media";
import { DEFAULT_FONT, fontFamilyOf } from "./renderFrame";
import { ExportCancelled, type RenderInput } from "./exportMedia";
import { bannerHtml, type Html5Doc } from "./html5-doc";
import { adLoops, GOOGLE_ADS_MAX_ZIP_BYTES } from "./google-ads";
import { videoDuration } from "./renderFrame";

/** The banner could not be made small enough for ad platforms. */
export class Html5TooLarge extends Error {}

const toBase64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const FONT_MIME: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

export type Html5Options = { clickUrl: string; loops: number; title: string; customFonts?: CustomFont[] };

async function imageFile(img: HTMLImageElement, maxSide: number, keepAlpha: boolean, quality: number) {
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const blob = await c.convertToBlob(keepAlpha ? { type: "image/png" } : { type: "image/jpeg", quality });
  return { data: new Uint8Array(await blob.arrayBuffer()), ext: keepAlpha ? "png" : "jpg" };
}

function fontExt(type: string | null, path: string) {
  const fromPath = path.split("?")[0]!.match(/\.(woff2|woff|ttf|otf)$/i)?.[1]?.toLowerCase();
  if (fromPath) return fromPath;
  const t = type ?? "";
  return t.includes("woff2") ? "woff2" : t.includes("woff") ? "woff" : t.includes("otf") ? "otf" : "ttf";
}

/** Google css2 subset for exactly the ad's text, parsed into font files. */
async function googleFaces(family: string, weight: number, text: string) {
  const base = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`;
  const t = `&text=${encodeURIComponent(text)}`;
  let css = "";
  // Same request as the preview's loader first; families without that exact weight fall back to their default.
  for (const url of [`${base}:wght@${weight}${t}`, `${base}${t}`]) {
    try {
      const r = await fetch(url);
      if (r.ok) { css = await r.text(); break; }
    } catch { /* try the next form */ }
  }
  const out: { url: string; range?: string }[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const url = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (url) out.push({ url, ...(range ? { range } : {}) });
  }
  return out;
}

export async function exportHtml5(input: RenderInput, opts: Html5Options, signal: AbortSignal, onProgress: (p: number) => void): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const { project, frames, brand, images } = input;
  const all = allFormatFrames(frames);

  // Images: resized to what this banner can show (2x for sharp screens).
  const maxSide = Math.max(input.width, input.height) * 2.5;
  const alphaPaths = new Set<string>();
  for (const format of REEL_FORMATS) {
    const l = projectForFormat(project, format).logo;
    for (const p of [l.path, l.light_path, l.dark_path]) if (p) alphaPaths.add(p);
  }
  for (const f of all) if (f.subline?.mode === "image" && f.subline.image_path) alphaPaths.add(f.subline.image_path);
  const entries = [...images.entries()];
  const encodeImages = async (scale: number, quality: number) => {
    const out: Record<string, Uint8Array> = {};
    const map: Record<string, string> = {};
    let i = 0;
    for (const [path, img] of entries) {
      if (signal.aborted) throw new ExportCancelled();
      const { data, ext } = await imageFile(img, maxSide * scale, alphaPaths.has(path), quality);
      const name = `img${++i}.${ext}`;
      out[name] = data;
      map[path] = name;
    }
    return { out, map };
  };
  // Fonts: the exact faces the preview uses.
  const specs = new Map<string, { family: string; weight: number }>();
  for (const f of all) {
    if (f.headline?.text) { const fam = fontFamilyOf(f.headline); specs.set(`${f.headline.font_weight ?? 700}|${fam}`, { family: fam, weight: f.headline.font_weight ?? 700 }); }
    if (f.subline?.text) { const fam = fontFamilyOf(f.subline); specs.set(`${f.subline.font_weight ?? 500}|${fam}`, { family: fam, weight: f.subline.font_weight ?? 500 }); }
  }
  const endFam = brand?.font || DEFAULT_FONT;
  specs.set(`600|${endFam}`, { family: endFam, weight: 600 });
  const text = all.map((f) => `${f.headline?.text ?? ""} ${f.subline?.mode === "image" ? "" : f.subline?.text ?? ""}`).join(" ") + " Made with Gravity Pants " + (project.end_card?.cta_text ?? "") + " " + (brand?.endCard?.cta_text ?? "");
  const fonts: Html5Doc["fonts"] = [];
  for (const { family, weight } of specs.values()) {
    if (signal.aborted) throw new ExportCancelled();
    const custom = opts.customFonts?.find((c) => c.family === family);
    if (custom) {
      const url = await getMediaUrl(custom.path);
      if (!url) continue;
      const r = await fetch(url);
      if (!r.ok) continue;
      const ext = fontExt(r.headers.get("content-type"), custom.path);
      fonts.push({ family, weight, file: `data:${FONT_MIME[ext]};base64,${toBase64(new Uint8Array(await r.arrayBuffer()))}` });
      continue;
    }
    for (const face of await googleFaces(family, weight, text)) {
      const r = await fetch(face.url);
      if (!r.ok) continue;
      const ext = fontExt(r.headers.get("content-type"), "");
      fonts.push({ family, weight, file: `data:${FONT_MIME[ext]};base64,${toBase64(new Uint8Array(await r.arrayBuffer()))}`, ...(face.range ? { unicodeRange: face.range } : {}) });
    }
  }
  onProgress(0.3);

  // Google Ads: zip at most 600 KB, animation at most 30 seconds. Shrink photos until it fits.
  const loops = adLoops(opts.loops, videoDuration(project, frames, brand));
  const tries: [number, number][] = [[1, 0.82], [0.8, 0.75], [0.65, 0.7], [0.5, 0.65], [0.4, 0.6], [0.3, 0.55]];
  for (let t = 0; t < tries.length; t++) {
    const [scale, quality] = tries[t]!;
    const { out, map } = await encodeImages(scale, quality);
    const doc: Html5Doc = {
      project, frames, brand, format: input.format, width: input.width, height: input.height,
      watermark: !!input.watermark, loops, images: map, fonts,
    };
    const zip = zipSync({
      ...out,
      "index.html": strToU8(bannerHtml(opts.title, input.width, input.height, opts.clickUrl, JSON.stringify(doc))),
      "ad.js": strToU8(runtimeJs),
    }, { level: 9 });
    onProgress(0.3 + ((t + 1) / tries.length) * 0.7);
    if (zip.byteLength <= GOOGLE_ADS_MAX_ZIP_BYTES) {
      onProgress(1);
      return new Blob([new Uint8Array(zip)], { type: "application/zip" });
    }
  }
  throw new Html5TooLarge("banner over 600 KB");
}
