import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, MoreHorizontal, Pause, Play, Redo2, Undo2, X } from "lucide-react";
import { AdName, STEPS, StepBar, type StepKey, type StepTitleInfo } from "./StepShell";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FrameThumb } from "@/components/editor/FrameThumb";
import { frameWidth } from "@/components/editor/FrameRail";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { cn } from "@/lib/utils";
import { AdPills } from "./AdPills";
import { PublishToGravityPants } from "@/components/admin/PublishToGravityPants";

/** True below 1000px wide, where every step stacks (same breakpoint as Edit). */
export function useCompactStudio() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 999px)");
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return compact;
}

export type UndoControls = { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };

/** 56px top bar shared by all five steps: back · name · saved | step bar | (undo/redo) ⋯ primary. */
export function StudioTopBar({ adId, step, title, undo, menu, next }: { adId: string; step: StepKey; title: StepTitleInfo; undo?: UndoControls | undefined; menu?: ReactNode; next: ReactNode }) {
  const current = STEPS.findIndex((s) => s.key === step);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl+";
  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-ap-hairline bg-ap-card px-3 safe-top md:px-4">
      <Link to="/" aria-label="Gravity Pants home" className="hidden shrink-0 sm:flex"><GravityPantsLogo size={26} /></Link>
      <Link to="/app/ads" className="flex min-h-0 shrink-0 items-center text-[14px] text-ap-blue hover:text-ap-blue-hover">
        <ChevronLeft className="size-4" strokeWidth={1.7} /> <span className="hidden sm:inline">Your Ads</span>
      </Link>
      <span className="hidden text-ap-faint sm:inline" aria-hidden>·</span>
      <AdName title={title} />
      <div className="flex-1" />
      <StepBar adId={adId} current={current} className="absolute left-1/2 hidden -translate-x-1/2 min-[1360px]:inline-flex" />
      <div className="flex shrink-0 items-center gap-1">
        {undo && (
          <>
            <button type="button" onClick={undo.onUndo} disabled={!undo.canUndo} aria-label="Undo" title={`Undo (${mod}Z)`} className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel disabled:opacity-35 disabled:hover:bg-transparent"><Undo2 className="size-[18px]" strokeWidth={1.7} /></button>
            <button type="button" onClick={undo.onRedo} disabled={!undo.canRedo} aria-label="Redo" title={`Redo (${isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"})`} className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel disabled:opacity-35 disabled:hover:bg-transparent"><Redo2 className="size-[18px]" strokeWidth={1.7} /></button>
          </>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="More" className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel"><MoreHorizontal className="size-[18px]" strokeWidth={1.7} /></button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[300px] space-y-3 p-3">
            {menu}
            <div className="flex items-center justify-between border-t border-ap-hairline pt-3 text-[13px] text-ap-muted">Help <HelpMenu /></div>
          </PopoverContent>
        </Popover>
        {next}
      </div>
    </header>
  );
}

/** Steps on screens too narrow for the centred step bar. */
export function StudioStepStrip({ adId, step }: { adId: string; step: StepKey }) {
  return (
    <div className="shrink-0 overflow-x-auto border-b border-ap-hairline bg-ap-card px-3 py-1.5 min-[1360px]:hidden">
      <StepBar adId={adId} current={STEPS.findIndex((s) => s.key === step)} className="flex w-max" />
    </div>
  );
}

/** Fills the screen below anything above it (e.g. a site notice) so the page never scrolls. */
export function useShellHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTop(Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);
  return { ref, style: { height: `calc(100dvh - ${top}px)` } };
}

/** Grey dot-grid canvas: the preview is the largest box of the ratio that fits, centred, gliding on resize. */
export function StudioCanvas({ ratio, label, children, notice, overlay, onEmptyClick }: { ratio: number; label?: string | undefined; children: ReactNode; notice?: ReactNode; overlay?: ReactNode; onEmptyClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const aw = Math.max(0, el.clientWidth - 80);
      const ah = Math.max(0, el.clientHeight - 56);
      const w = Math.min(aw, ah * ratio);
      setBox({ w: Math.floor(w), h: Math.floor(w / ratio) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);
  return (
    <div ref={ref} className="ap-dot-grid relative min-h-0 flex-1 overflow-hidden">
      {notice && <div className="absolute inset-x-3 top-3 z-10 flex flex-col items-center gap-2">{notice}</div>}
      <div className="absolute inset-0 grid place-items-center" onPointerDown={(e) => { if (e.target === e.currentTarget) onEmptyClick?.(); }}>
        <div style={{ width: box.w, height: box.h }} className="relative transition-[width,height] duration-[280ms] ease-out motion-reduce:transition-none">
          {box.w > 0 && children}
          {overlay}
        </div>
      </div>
      {label && <span className="pointer-events-none absolute bottom-2.5 left-3 text-[12px] text-ap-muted nums">{label}</span>}
    </div>
  );
}

/** 52px bar above the canvas. */
export function StageBar({ label, children }: { label?: string; children?: ReactNode }) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-3 overflow-x-auto">
      {label && <span className="shrink-0 text-[12px] font-semibold text-ap-badge">{label}</span>}
      {children}
    </div>
  );
}

export function StageChip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  const cls = cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium nums outline-hidden focus-visible:shadow-ap-focus", on ? "bg-ap-soft-blue text-ap-blue" : "bg-ap-panel text-ap-body");
  return onClick ? <button type="button" aria-pressed={on} onClick={onClick} className={cn(cls, !on && "hover:text-ap-ink")}>{children}</button> : <span className={cls}>{children}</span>;
}

/** 116px bottom bar: play + time left, strip middle, summary right. */
export function StudioBottom({ playing, onTogglePlay, time, total, disabled, children, right }: { playing?: boolean; onTogglePlay?: () => void; time?: number; total?: number; disabled?: boolean; children: ReactNode; right?: ReactNode }) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  return (
    <footer className="flex h-[116px] shrink-0 items-center gap-4 border-t border-ap-hairline bg-ap-card px-3 md:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <button type="button" onClick={onTogglePlay} disabled={disabled} aria-label={playing ? "Pause" : "Play"} className="grid size-10 min-h-0 min-w-0 place-items-center rounded-lg bg-ap-blue text-ap-card hover:bg-ap-blue-hover disabled:bg-ap-panel disabled:text-ap-faint">
          {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
        {!disabled && time !== undefined && total !== undefined && (
          <div className="hidden leading-tight sm:block">
            <div className="text-[14px] font-semibold text-ap-ink nums">{fmt(time)}</div>
            <div className="text-[12px] text-ap-muted nums">of {fmt(total)}</div>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="hidden shrink-0 flex-col items-end gap-1 text-[12px] text-ap-muted nums md:flex">{right}</div>}
    </footer>
  );
}

const TR: Record<string, string> = { cut: "Cut", fade: "Fade", slide: "Slide", zoom: "Zoom", wipe: "Wipe", dip_black: "Dip" };

/** Frame strip for steps other than Edit. Read-only unless onReorder is given. */
export function FrameStrip({ doc, format, images, version, current, onSelect, onReorder, onAdd, addLabel = "Add photos" }: {
  doc: EditorDoc; format: Format; images: Map<string, HTMLImageElement>; version: number; current?: number;
  onSelect?: (i: number) => void; onReorder?: (from: number, to: number) => void; onAdd?: (() => void) | undefined; addLabel?: string;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <nav aria-label="Frames" className="-mx-1 flex items-start gap-2 overflow-x-auto px-1 pt-1 pb-2">
      {doc.frames.map((f, i) => (
        <div key={f.id} className="flex shrink-0 items-start gap-2">
          {i > 0 && <span className="mt-6 rounded-full bg-ap-panel px-2 py-0.5 text-[10px] font-medium text-ap-body">{TR[f.transition_in?.type ?? "cut"] ?? "Cut"}</span>}
          <div className="flex flex-col items-center" style={{ width: frameWidth(f.duration_sec) }}>
            <button
              type="button"
              aria-label={`Frame ${i + 1}`}
              aria-pressed={current === i}
              draggable={Boolean(onReorder)}
              onDragStart={() => setFrom(i)}
              onDragOver={(e) => { if (onReorder && from !== null) { e.preventDefault(); setOver(i); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); if (onReorder && from !== null && from !== i) onReorder(from, i); setFrom(null); setOver(null); }}
              onDragEnd={() => { setFrom(null); setOver(null); }}
              onClick={() => onSelect?.(i)}
              className={cn("relative h-16 w-full min-h-0 min-w-0 overflow-hidden rounded-[10px] bg-control-fill p-0", current === i && "ring-2 ring-primary ring-offset-2 ring-offset-card", over === i && from !== i && "ring-2 ring-primary/40", from === i && "opacity-50", onReorder && "cursor-grab")}
            >
              <FrameThumb doc={doc} index={i} format={format} images={images} version={version} width={112} className="pointer-events-none h-full w-full" />
              <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-foreground/70 text-[10px] font-semibold text-background tabular-nums">{i + 1}</span>
            </button>
            <span className="mt-1 h-7 text-[11px] leading-7 text-secondary-text tabular-nums">{f.duration_sec.toFixed(1)}s</span>
          </div>
        </div>
      ))}
      {onAdd && (
        <button type="button" onClick={onAdd} aria-label={addLabel} className="ml-2 grid size-16 shrink-0 place-items-center rounded-[10px] border border-dashed border-placeholder-border text-[22px] text-icon">+</button>
      )}
    </nav>
  );
}

/** Format step strip: no frames yet. */
export function EmptyStrip() {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: 5 }, (_, i) => <span key={i} aria-hidden className="size-16 shrink-0 rounded-[10px] border border-dashed border-placeholder-border" />)}
      <span className="ml-2 hidden text-[13px] text-ap-muted lg:inline">Your photos become frames here in the next step.</span>
    </div>
  );
}

/** Left panel: 60px header (eyebrow + title), scrolling body, optional fixed footer. */
export function StudioPanel({ step, title, tag, children, footer }: { step: StepKey; title: string; tag?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const n = STEPS.findIndex((s) => s.key === step) + 1;
  return (
    <>
      <div className="flex h-[60px] shrink-0 flex-col justify-center border-b border-ap-hairline px-6">
        <div className="text-[12px] font-semibold text-ap-badge nums">Step {n} of {STEPS.length}</div>
        <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.015em] text-ap-ink">{title}{tag}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-8">{children}</div>
      {footer && <div className="shrink-0 border-t border-ap-hairline px-6 py-3 text-[12px] text-ap-muted">{footer}</div>}
    </>
  );
}

/** One layout for Format, Photos, Export and Share (Edit composes the same parts with its rail + drawer). */
export function StudioShell({ adId, step, title, undo, menu, next, banner, panel, stage, bottom, className }: {
  adId: string; step: StepKey; title: StepTitleInfo; undo?: UndoControls | undefined; menu?: ReactNode; next: ReactNode; banner?: ReactNode;
  panel: ReactNode; stage: ReactNode; bottom: ReactNode; className?: string;
}) {
  const compact = useCompactStudio();
  const shell = useShellHeight();
  return (
    <div ref={shell.ref} style={compact ? undefined : shell.style} className={cn("ap-flow flex flex-col bg-ap-card", compact ? "min-h-dvh" : "overflow-hidden", className)}>
      <StudioTopBar adId={adId} step={step} title={title} undo={undo} menu={menu} next={next} />
      <StudioStepStrip adId={adId} step={step} />
      {banner}
      {compact ? (
        <>
          <section aria-label="Preview" className="flex h-[52vh] min-h-[320px] shrink-0 flex-col bg-ap-card px-3 pb-3">{stage}</section>
          {bottom}
          <aside aria-label="Settings" className="flex flex-col border-t border-ap-hairline bg-ap-card">{panel}</aside>
        </>
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <aside aria-label="Settings" className="flex w-[428px] shrink-0 flex-col border-r border-ap-hairline bg-ap-card">{panel}</aside>
            <section aria-label="Preview" className="flex min-w-0 flex-1 flex-col bg-ap-card px-4 pb-4">{stage}</section>
          </div>
          {bottom}
        </>
      )}
    </div>
  );
}

/** The ⋯ menu shared by every step: Brand kit, Format and Previous exports (Help is added by the top bar). */
export function AdMenu({ doc, set, readOnly, exports, extra }: { doc: EditorDoc; set: (next: EditorDoc) => void; readOnly?: boolean | undefined; exports?: ReactNode; extra?: ReactNode }) {
  return (
    <>
      <div className="space-y-1.5">
        <p className="text-[12px] font-semibold text-ap-badge">Brand kit · Format</p>
        <AdPills doc={doc} set={set} readOnly={readOnly} />
      </div>
      {extra}
      <PublishToGravityPants projectId={doc.project.id} />
      <div className="flex items-center justify-between border-t border-ap-hairline pt-3 text-[13px] text-ap-muted">
        Previous exports
        {exports ?? <Link to="/app/exports" className="text-ap-blue hover:text-ap-blue-hover">See the list</Link>}
      </div>
    </>
  );
}

export { X };
