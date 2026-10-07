import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FacetedReel } from "@/lib/directory/directory.functions";

const SIZE: Record<string, { w: number; h: number }> = { "9x16": { w: 165, h: 293 }, "1x1": { w: 200, h: 200 }, "16x9": { w: 256, h: 144 } };

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

/** Drifting band of featured reels. Seamless loop: the list renders twice and slides by half. */
export function FeaturedBand({ label, reels, secondsPerReel, seconds, onOpen, filterGap = 24, labelSize = 13, labelGap = 16, phoneStyle = false }: {
  label: string; reels: FacetedReel[]; secondsPerReel: number; seconds: (r: FacetedReel) => number | null; onOpen: (r: FacetedReel) => void;
  phoneStyle?: boolean; filterGap?: number; labelSize?: number; labelGap?: number;
}) {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !phoneStyle || reduced || paused) return;
    const media = window.matchMedia("(max-width: 767px)");
    let frame = 0;
    let last = 0;
    const step = (time: number) => {
      if (media.matches) {
        const half = (el.firstElementChild?.scrollWidth ?? 0) / 2;
        if (last && half > 0) el.scrollLeft = (el.scrollLeft + Math.min(time - last, 50) * half / (Math.max(20, reels.length * secondsPerReel) * 1000)) % half;
      }
      last = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phoneStyle, reduced, paused, reels, secondsPerReel]);
  if (!reels.length) return null;
  const setKey = reels.map((r) => r.id).join(",");
  const copies = reduced ? [0] : [0, 1];
  return (
    <section aria-label={label} className="dir-featured-band relative bg-ap-panel pt-4 pb-12"
      style={{ "--featured-filter-gap": `${filterGap}px`, "--featured-label-size": `${labelSize}px`, "--featured-label-gap": `${labelGap}px` } as CSSProperties}>
      <div className="dir-featured-heading pointer-events-none relative z-10 mx-auto flex min-h-8 max-w-[1280px] items-center justify-between gap-4 px-6">
        <p className="dir-featured-label min-w-0 font-semibold text-ap-ink nums">{label}</p>
        {!reduced && (
          <Button variant="ghost" type="button" aria-pressed={paused} aria-label={paused ? "Play featured reels" : "Pause featured reels"} onClick={() => setPaused((p) => !p)}
            className="pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full bg-ap-card p-0 text-ap-ink shadow-ap-soft hover:bg-ap-media">
            {paused ? <Play className="size-3.5" strokeWidth={1.7} /> : <Pause className="size-3.5" strokeWidth={1.7} />}
          </Button>
        )}
      </div>
      <div ref={scroller} key={setKey} onPointerDown={() => { if (phoneStyle && window.matchMedia("(max-width: 767px)").matches) setPaused(true); }} className={cn("dir-featured-fade pt-5", reduced ? "overflow-x-auto" : "overflow-hidden")}>
        <div data-paused={paused} className={cn("dir-marquee flex w-max items-center", reduced && "px-6")}
          style={{ animationDuration: `${Math.max(20, reels.length * secondsPerReel)}s` }}>
          {copies.map((c) => (
            <ul key={c} aria-hidden={c === 1 || undefined} className="flex items-center gap-8 pr-8">
              {reels.map((r, i) => {
                const s = SIZE[r.formats[0] ?? "9x16"] ?? { w: 165, h: 293 };
                const sec = seconds(r);
                const shift = i % 4 === 0 ? "translate-y-5" : i % 4 === 2 ? "-translate-y-5" : "";
                return (
                  <li key={r.id} className={cn("group shrink-0", shift)}>
                    <button type="button" tabIndex={c === 1 ? -1 : undefined} onClick={() => onOpen(r)} aria-label={`Open ${r.title} by ${r.brand_name}`}
                      className="dir-featured-reel block overflow-hidden rounded-[6px] bg-ap-card shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)] transition-transform duration-200 group-hover:-translate-y-1.5 group-focus-within:-translate-y-1.5 motion-reduce:transition-none"
                      style={{ ["--w" as string]: `${s.w}px`, ["--h" as string]: `${s.h}px` }}>
                      {r.poster && <img src={r.poster} alt="" loading="lazy" className="size-full object-cover" />}
                    </Button>
                    <p className="mt-2 h-4 text-center text-[12px] text-ap-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 nums">
                      {r.brand_name}{sec ? ` · ${sec} sec` : ""}
                    </p>
                    <ConceptReelNotice brandName={r.brand_name} brandSlug={r.brand_slug} className="max-w-[165px] text-center" />
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
