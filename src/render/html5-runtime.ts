/**
 * Player that ships inside HTML5 banner zips. It is bundled on its own (see the
 * html5Runtime plugin in vite.config.ts) and draws with the same renderAt() as the
 * preview and MP4/GIF export, so the banner plays exactly as previewed.
 */
import { renderAt, videoDuration } from "./renderFrame";
import type { Html5Doc } from "./html5-doc";

declare global {
  interface Window {
    __GP_AD__?: Html5Doc;
    clickTag?: string;
  }
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function boot() {
  const doc = window.__GP_AD__;
  const canvas = document.getElementById("ad") as HTMLCanvasElement | null;
  if (!doc || !canvas) return;
  await Promise.all(
    doc.fonts.map(async (f) => {
      try {
        const face = new FontFace(f.family, `url(${f.file})`, { weight: String(f.weight), ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}) });
        await face.load();
        document.fonts.add(face);
      } catch { /* keeps going with the fallback face */ }
    }),
  );
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(Object.entries(doc.images).map(async ([path, file]) => {
    const img = await loadImg(file);
    if (img) images.set(path, img);
  }));

  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const W = Math.round(doc.width * dpr), H = Math.round(doc.height * dpr);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const duration = Math.max(0.1, videoDuration(doc.project, doc.frames, doc.brand));
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const draw = (t: number) => renderAt(ctx, doc.project, doc.frames, doc.format, t, { width: W, height: H, images, brand: doc.brand, watermark: doc.watermark });
  if (reduce) return draw(Math.max(0, duration - 0.01));
  const t0 = performance.now();
  let plays = 0;
  const loop = (now: number) => {
    const elapsed = (now - t0) / 1000;
    const p = Math.floor(elapsed / duration);
    if (doc.loops > 0 && p >= doc.loops) return draw(Math.max(0, duration - 0.01));
    plays = p;
    draw(elapsed - plays * duration);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void boot();
