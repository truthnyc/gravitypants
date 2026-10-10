import { useEffect, useMemo, useState } from "react";
import type { Template, TemplateSlide } from "@/lib/stillframe/data";
import { cn } from "@/lib/utils";
import { RenderCanvas, templateProject, useLoopTime } from "./TemplateRender";

export type Aspect = "9:16" | "4:5" | "1:1" | "16:9";

export function templateFormat(t: Template): Aspect {
  return (t.format ?? t.settings?.primary_format ?? "9:16") as Aspect;
}

/** Ordered slides: the template's own list, or derived from a saved ad's frames. */
export function templateSlides(t: Template): TemplateSlide[] {
  if (t.slides?.length) return t.slides;
  const TR: Record<string, TemplateSlide["transition_in"]> = { cut: "cut", fade: "fade", slide: "slide", zoom: "zoom", wipe: "swipe-left", dip_black: "fade" };
  const TA: Record<string, TemplateSlide["text_animation"]> = { none: "none", rise: "rise-up", fade: "fade-in", pop: "zoom", typewriter: "typewriter" };
  return (t.settings?.frames ?? []).map((f, i) => ({
    role: `Slide ${i + 1}`,
    duration_sec: Number(f.duration_sec) || 2.5,
    transition_in: i === 0 ? "none" : TR[f.transition_in?.type] ?? "fade",
    text_animation: TA[f.headline?.animation ?? "none"] ?? "none",
    photo_motion: f.photo?.movement === "slow_zoom_in" ? "slow-zoom-in" : f.photo?.movement?.startsWith("pan") ? "pan" : "none",
    headline_placeholder: f.headline?.text ?? "",
    subline_placeholder: f.subline?.text ?? "",
  }));
}

export function templateBackground(t: Template) {
  const bg = (t.style as { background_color?: string } | undefined)?.background_color;
  return bg ?? t.settings?.frames?.[0]?.photo?.background_color ?? "#1D1D1F";
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const RATIO: Record<Aspect, string> = { "9:16": "9 / 16", "4:5": "4 / 5", "1:1": "1 / 1", "16:9": "16 / 9" };

/** Template preview at its real aspect ratio, drawn by renderAt (real fonts, layout, logo); loops while `playing`. */
export function TemplatePreview({ template, playing, className }: { template: Template; playing: boolean; className?: string; quiet?: boolean }) {
  const format = templateFormat(template);
  const bg = templateBackground(template);
  const project = useMemo(() => templateProject(template), [template]);
  const time = useLoopTime(project, playing);
  return (
    <div
      className={cn("relative overflow-hidden rounded-sm", format === "16:9" ? "w-full max-w-full" : "h-full", className)}
      style={{ aspectRatio: RATIO[format], background: bg, maxHeight: "100%" }}
    >
      <RenderCanvas project={project} format={format} time={time} />
    </div>
  );
}

export const templateSlug = (t: Template) => t.slug ?? t.id;

export function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2].map((n) => <span key={n} className={cn("h-1 w-[22px] rounded-lg", n <= step ? "bg-primary" : "bg-control-fill")} />)}
      </div>
      <span className="nums text-[13px] text-secondary-text">Step {step} of 2</span>
    </div>
  );
}

