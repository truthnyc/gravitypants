import { useEffect, useMemo, useRef, useState } from "react";
import type { Format, Frame, ProjectWithFrames } from "@/lib/stillframe/types";
import { DEFAULT_LOGO } from "@/lib/stillframe/types";
import type { CustomSlide, Template } from "@/lib/stillframe/data";
import { docFromRow, previewProject } from "@/lib/stillframe/template-doc";
import { ensureFonts, renderAt, restTime } from "@/render/renderFrame";
import { loadImages } from "@/render/images";
import { cn } from "@/lib/utils";

/** A throwaway project that draws a template exactly as ads made from it look (fonts, positions, logo). */
export function templateProject(t: Template): ProjectWithFrames {
  if (t.source === "system" && t.slides?.length) return previewProject(docFromRow(t));
  const s = t.settings;
  const now = new Date().toISOString();
  return {
    id: "preview",
    workspace_id: "",
    name: t.name,
    primary_format: s.primary_format,
    formats: s.formats,
    pace: s.pace,
    logo: { ...DEFAULT_LOGO, ...s.logo },
    end_card: {},
    is_template: false,
    deleted_at: null,
    thumbnail_url: null,
    created_at: now,
    updated_at: now,
    frames: (s.frames ?? []).map((f, i) => ({ ...f, id: `f${i}`, project_id: "", sort_order: i, photo: { ...(f as Frame).photo } }) as Frame),
  };
}

/** The template preview with the customer's typed text and photos laid over it. */
export function customizedProject(t: Template, values: CustomSlide[]): ProjectWithFrames {
  // Every slide (matches the form's indexes) and no stock sample photos.
  const base = t.source === "system" && t.slides?.length
    ? previewProject(docFromRow(t), { allSlides: true, samples: false })
    : templateProject(t);
  const frames = base.frames.map((f, i) => {
    const v = values[i];
    if (!v) return f;
    return {
      ...f,
      photo: v.photo ? { ...f.photo, path: v.photo.path, url: v.photo.path } : f.photo,
      // Never show the template's sample copy — empty fields render empty.
      headline: f.headline ? { ...f.headline, text: v.headline.trim() } : f.headline,
      subline: f.subline ? { ...f.subline, text: v.subline.trim() } : f.subline,
    } as Frame;
  });
  // Ready-made templates don't hand their logo to customers' ads.
  const logo = t.source === "system" ? { ...base.logo, path: null, light_path: null, dark_path: null } : base.logo;
  return { ...base, logo, frames };
}

function framePaths(p: ProjectWithFrames) {
  const l = p.logo as { path?: string | null; light_path?: string | null; dark_path?: string | null };
  return [...p.frames.map((f) => f.photo?.path), l.path, l.light_path, l.dark_path].filter(Boolean) as string[];
}

/** Draws a project through renderAt into a canvas that fills its box. */
export function RenderCanvas({ project, format, time, className }: { project: ProjectWithFrames; format: Format; time: number | null; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [images, setImages] = useState(() => new Map<string, HTMLImageElement>());
  const [ready, setReady] = useState(false);
  const pathKey = framePaths(project).join("|");
  const fontKey = project.frames.map((f) => `${f.headline?.font_family}/${f.headline?.font_weight}/${f.subline?.font_family}/${f.subline?.font_weight}`).join("|");

  useEffect(() => {
    let live = true;
    void Promise.all([loadImages(framePaths(project)), ensureFonts(project.frames)]).then(([m]) => {
      if (!live) return;
      setImages(m);
      setReady(true);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, fontKey]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => { if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(size.w * dpr);
  const h = Math.round(size.h * dpr);
  const t = time ?? restTime(project.frames, 0);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !w || !h || !ready || !project.frames.length) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderAt(ctx, project, project.frames, format, t, { width: w, height: h, images });
  }, [project, images, ready, format, t, w, h]);

  return (
    <div ref={box} className={cn("absolute inset-0", className)}>
      <canvas ref={ref} width={w || 1} height={h || 1} className={cn("h-full w-full transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")} />
    </div>
  );
}

/** rAF clock looping through the project while `playing`; null (rest frame) otherwise. */
export function useLoopTime(project: ProjectWithFrames, playing: boolean) {
  const total = useMemo(() => project.frames.reduce((s, f) => s + Math.max(0.1, Number(f.duration_sec ?? 2.5)), 0), [project]);
  const [time, setTime] = useState<number | null>(null);
  useEffect(() => {
    if (!playing || !total) { setTime(null); return; }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc = (acc + (now - last) / 1000) % total;
      last = now;
      setTime(acc);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);
  return time;
}
