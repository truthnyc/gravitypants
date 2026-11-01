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

export type Html5Options = { clickUrl: string; loops: number; title: string; customFonts?: CustomFont[] };

async function imageFile(img: HTMLImageElement, maxSide: number, keepAlpha: boolean) {
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const blob = await c.convertToBlob(keepAlpha ? { type: "image/png" } : { type: "image/jpeg", quality: 0.85 });
  return { data: new Uint8Array(await blob.arrayBuffer()), ext: keepAlpha ? "png" : "jpg" };
}

async function fetchBytes(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Google css2 subset for exactly the ad's text, parsed into font files. */
async function googleFaces(family: string, weight: number, text: string) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
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
  const imageMap: Record<string, string> = {};
  let i = 0;
  const entries = [...images.entries()];
  for (const [path, img] of entries) {
    if (signal.aborted) throw new ExportCancelled();
    const keep = alphaPaths.has(path) || /\.(png|svg|webp|gif)$/i.test(path);
    const { data, ext } = await imageFile(img, maxSide, keep);
    const name = `img${++i}.${ext}`;
    files[name] = data;
    imageMap[path] = name;
    onProgress((i / Math.max(1, entries.length)) * 0.5);
  }

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
  let n = 0;
  for (const { family, weight } of specs.values()) {
    if (signal.aborted) throw new ExportCancelled();
    const custom = opts.customFonts?.find((c) => c.family === family);
    if (custom) {
      const url = await getMediaUrl(custom.path);
      if (!url) continue;
      const ext = custom.path.split(".").pop()?.toLowerCase() ?? "woff2";
      const name = `font${++n}.${ext}`;
      files[name] = await fetchBytes(url);
      fonts.push({ family, weight, file: name });
      continue;
    }
    for (const face of await googleFaces(family, weight, text)) {
      const name = `font${++n}.${face.url.split("?")[0]!.split(".").pop() || "woff2"}`;
      files[name] = await fetchBytes(face.url);
      fonts.push({ family, weight, file: name, ...(face.range ? { unicodeRange: face.range } : {}) });
    }
  }
  onProgress(0.8);

  const doc: Html5Doc = {
    project, frames, brand, format: input.format, width: input.width, height: input.height,
    watermark: !!input.watermark, loops: opts.loops, images: imageMap, fonts,
  };
  files["index.html"] = strToU8(bannerHtml(opts.title, input.width, input.height, opts.clickUrl, JSON.stringify(doc)));
  files["ad.js"] = strToU8(runtimeJs);
  const zip = zipSync(files, { level: 6 });
  onProgress(1);
  return new Blob([new Uint8Array(zip)], { type: "application/zip" });
}
