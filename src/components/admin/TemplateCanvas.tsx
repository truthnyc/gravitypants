import { useEffect, useMemo, useRef, useState } from "react";
import type { Format } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { ensureFonts, frameStarts, renderAt, restTime, totalDuration } from "@/render/renderFrame";
import { loadImages } from "@/render/images";
import { previewProject, type TemplateDoc } from "@/lib/stillframe/template-doc";

/** Loaded sample photos + fonts for a doc; bumps `ready` when they change. */
export function useDocAssets(doc: TemplateDoc) {
  const project = useMemo(() => previewProject(doc), [doc]);
  const [images, setImages] = useState(() => new Map<string, HTMLImageElement>());
  const [ready, setReady] = useState(0);
  const key = [...doc.slides.map((s) => s.sample_photo ?? ""), doc.style.logo_path ?? ""].join("|");
  const fontKey = `${doc.style.headline.font}|${doc.style.headline.weight}|${doc.style.subline.font}`;
  useEffect(() => {
    let live = true;
    const paths = [...doc.slides.map((s) => s.sample_photo), doc.style.logo_path].filter(Boolean) as string[];
    void Promise.all([loadImages(paths), ensureFonts(project.frames)]).then(([m]) => {
      if (!live) return;
      setImages(m);
      setReady((r) => r + 1);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fontKey]);
  return { project, images, ready };
}

/** Draws the template exactly like ads are drawn (renderAt), so the preview matches exports. */
export function TemplateCanvas({ doc, format, time, width, className }: { doc: TemplateDoc; format: Format; time: number; width: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { project, images, ready } = useDocAssets(doc);
  const size = FORMAT_SIZE[format];
  const h = Math.round((width * size.height) / size.width);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderAt(ctx, project, project.frames, format, time, { width: Math.round(width * dpr), height: Math.round(h * dpr), images });
  }, [project, images, ready, format, time, width, h, dpr]);
  return <canvas ref={ref} width={Math.round(width * dpr)} height={Math.round(h * dpr)} style={{ width, height: h }} className={className} />;
}

/** Still of one slide as a JPEG data URL, for the template card thumbnail. */
export async function renderThumbnail(doc: TemplateDoc, slide = 0): Promise<string> {
  const project = previewProject(doc);
  const paths = [...doc.slides.map((s) => s.sample_photo), doc.style.logo_path].filter(Boolean) as string[];
  const [images] = await Promise.all([loadImages(paths), ensureFonts(project.frames)]);
  const size = FORMAT_SIZE[doc.format];
  const k = 540 / size.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size.width * k);
  canvas.height = Math.round(size.height * k);
  const ctx = canvas.getContext("2d")!;
  renderAt(ctx, project, project.frames, doc.format, restTime(project.frames, slide), { width: canvas.width, height: canvas.height, images });
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function useDocPlayback(doc: TemplateDoc) {
  const frames = useMemo(() => previewProject(doc).frames, [doc]);
  const total = totalDuration(frames);
  const starts = frameStarts(frames);
  const [time, setTime] = useState(() => restTime(frames, 0));
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => (t + dt >= total ? 0 : t + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);
  const index = Math.max(0, starts.findIndex((s, i) => time >= s && time < (starts[i + 1] ?? Infinity)));
  return {
    time: Math.min(time, total),
    total,
    starts,
    index,
    playing,
    toggle: () => setPlaying((p) => !p),
    seek: (i: number) => { setPlaying(false); setTime(restTime(frames, i)); },
  };
}

export const clock = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};
