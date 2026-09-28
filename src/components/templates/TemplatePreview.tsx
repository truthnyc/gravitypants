import { useEffect, useState } from "react";
import { MediaImage } from "@/components/stillframe/MediaImage";
import type { Template, TemplateSlide } from "@/lib/stillframe/data";
import { cn } from "@/lib/utils";

export type Aspect = "9:16" | "1:1" | "16:9";

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

const RATIO: Record<Aspect, string> = { "9:16": "9 / 16", "1:1": "1 / 1", "16:9": "16 / 9" };

/** Template thumbnail at its real aspect ratio; plays a looping slide preview while `playing`. */
export function TemplatePreview({ template, playing, className, quiet = false }: { template: Template; playing: boolean; className?: string; quiet?: boolean }) {
  const format = templateFormat(template);
  const slides = templateSlides(template);
  const bg = templateBackground(template);
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!playing || !slides.length) { setIndex(0); return; }
    // Quick preview: real timings at 1.5× speed.
    const ms = (slides[index]?.duration_sec ?? 2) * 1000 / 1.5;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setCycle((c) => c + 1);
    }, ms);
    return () => window.clearTimeout(id);
  }, [playing, index, slides]);

  const thumb = template.thumbnail_url;
  const slide = slides[index];

  return (
    <div
      className={cn("relative overflow-hidden rounded-sm", format === "16:9" ? "w-full max-w-full" : "h-full", className)}
      style={{ aspectRatio: RATIO[format], background: bg, maxHeight: "100%" }}
    >
      {!playing && thumb && !thumb.startsWith("/") && <MediaImage path={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {playing && slide && (
        <div key={cycle} className={cn("tpl-slide absolute inset-0", `tpl-in-${cycle === 0 ? "none" : slide.transition_in}`)} style={{ background: bg }}>
          <div className={cn("absolute inset-0 overflow-hidden", slide.photo_motion !== "none" && `tpl-photo-${slide.photo_motion}`)} style={{ background: "radial-gradient(120% 90% at 50% 30%, rgb(255 255 255 / 0.14), transparent 60%)" }}>
            {(() => {
              const s = slide as TemplateSlide & { sample_photo?: string | null; photo_focus?: { x: number; y: number }; photo_zoom?: number };
              if (!s.sample_photo) return null;
              const f = s.photo_focus ?? { x: 0.5, y: 0.5 };
              return (
                <div className="absolute inset-0" style={{ transform: `scale(${s.photo_zoom ?? 1})`, transformOrigin: `${f.x * 100}% ${f.y * 100}%` }}>
                  <MediaImage path={s.sample_photo} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${f.x * 100}% ${f.y * 100}%` }} />
                </div>
              );
            })()}
          </div>
          <div className="tpl-text absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center">
            <p className={cn("tpl-headline font-bold leading-[1.05]", `tpl-text-${slide.text_animation}`)}>{slide.headline_placeholder}</p>
            {slide.subline_placeholder && <p className={cn("tpl-subline mt-[4%] leading-snug", `tpl-text-${slide.text_animation}`)} style={{ animationDelay: "120ms" }}>{slide.subline_placeholder}</p>}
          </div>
        </div>
      )}
      {!playing && !quiet && (!thumb || thumb.startsWith("/")) && slides[0] && (
        <div className="tpl-text absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center">
          <p className="tpl-headline font-bold leading-[1.05]">{slides[0].headline_placeholder}</p>
        </div>
      )}
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

