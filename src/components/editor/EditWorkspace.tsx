import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Image as ImageIcon, MoreHorizontal, PaintBucket, PanelLeftClose, PanelLeftOpen, Pause, Play, Redo2, Shapes, TextQuote, Type, Undo2, X } from "lucide-react";
import type { InspectorSection } from "./Inspector";
import { SECTION_DOT, SECTION_LABEL } from "./EditToolbar";
import { AdName, STEPS, StepBar, type StepTitleInfo } from "@/components/app-ui/StepShell";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type RailKey = InspectorSection;
const RAIL: { key: RailKey; icon: typeof ImageIcon }[] = [
  { key: "background", icon: PaintBucket },
  { key: "photo", icon: ImageIcon },
  { key: "headline", icon: Type },
  { key: "subline", icon: TextQuote },
  { key: "logo", icon: Shapes },
];

/** True below 1000px wide, where the drawer becomes a bottom sheet. */
export function useCompactEditor() {
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

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export function EditTopBar({ adId, title, canUndo, canRedo, onUndo, onRedo, isMac, next, menu }: {
  adId: string; title: StepTitleInfo; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; isMac: boolean; next: ReactNode; menu: ReactNode;
}) {
  const current = STEPS.findIndex((s) => s.key === "edit");
  const mod = isMac ? "⌘" : "Ctrl+";
  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-ap-hairline bg-ap-card px-3 safe-top md:px-4">
      <Link to="/app/ads" className="flex min-h-0 shrink-0 items-center text-[14px] text-ap-blue hover:text-ap-blue-hover">
        <ChevronLeft className="size-4" strokeWidth={1.7} /> <span className="hidden sm:inline">Your Ads</span>
      </Link>
      <span className="hidden text-ap-faint sm:inline" aria-hidden>·</span>
      <AdName title={title} />
      <div className="flex-1" />
      <StepBar adId={adId} current={current} className="absolute left-1/2 hidden -translate-x-1/2 min-[1360px]:inline-flex" />
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title={`Undo (${mod}Z)`} className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel disabled:opacity-35 disabled:hover:bg-transparent"><Undo2 className="size-[18px]" strokeWidth={1.7} /></button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title={`Redo (${isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"})`} className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel disabled:opacity-35 disabled:hover:bg-transparent"><Redo2 className="size-[18px]" strokeWidth={1.7} /></button>
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
export function EditStepStrip({ adId }: { adId: string }) {
  return (
    <div className="shrink-0 overflow-x-auto border-b border-ap-hairline bg-ap-card px-3 py-1.5 min-[1360px]:hidden">
      <StepBar adId={adId} current={STEPS.findIndex((s) => s.key === "edit")} className="flex w-max" />
    </div>
  );
}

export function EditRail({ value, onChange, open, onToggle, compact, ownStyle }: { value: RailKey | null; onChange: (k: RailKey) => void; open: boolean; onToggle: () => void; compact: boolean; ownStyle: { headline: boolean; subline: boolean } }) {
  return (
    <nav aria-label="Edit panels" className={cn("flex shrink-0 bg-ap-card", compact ? "h-14 flex-row justify-around border-t border-ap-hairline" : "w-[76px] flex-col items-center gap-1 border-r border-ap-hairline py-3")}>
      {RAIL.map(({ key, icon: Icon }) => {
        const on = value === key;
        const own = (key === "headline" && ownStyle.headline) || (key === "subline" && ownStyle.subline);
        return (
          <button key={key} type="button" aria-pressed={on} onClick={() => onChange(key)} aria-label={own ? `${SECTION_LABEL[key]}, this frame has its own style` : SECTION_LABEL[key]}
            className={cn("relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium", compact ? "flex-1" : "h-[62px] w-[62px]", on ? "bg-ap-soft-blue text-ap-blue" : "text-ap-muted hover:bg-ap-panel hover:text-ap-ink")}>
            <Icon className="size-5" strokeWidth={1.7} />{SECTION_LABEL[key]}
            {own && <span aria-hidden className={cn("absolute top-2 right-2.5 size-1.5 rounded-full", SECTION_DOT[key])} />}
          </button>
        );
      })}
      {!compact && (
        <button type="button" onClick={onToggle} aria-label={open ? "Hide panel" : "Show panel"} title={`${open ? "Hide panel" : "Show panel"} (\\)`} className="mt-auto grid size-10 min-h-0 min-w-0 place-items-center rounded-lg text-ap-muted hover:bg-ap-panel hover:text-ap-ink">
          {open ? <PanelLeftClose className="size-[18px]" strokeWidth={1.7} /> : <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} />}
        </button>
      )}
    </nav>
  );
}

function DrawerHead({ section, eyebrow, onClose, closeIcon }: { section: RailKey | null; eyebrow: string; onClose: () => void; closeIcon: ReactNode }) {
  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-ap-hairline px-5">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-[0.08em] text-ap-muted uppercase nums">{eyebrow}</div>
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ap-ink">
          {section && <span aria-hidden className={cn("size-2.5 rounded-full", SECTION_DOT[section])} />}
          {section ? SECTION_LABEL[section] : "Nothing selected"}
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Hide panel" className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-muted hover:bg-ap-panel hover:text-ap-ink">{closeIcon}</button>
    </div>
  );
}

export function EditDrawer({ open, compact, onClose, section, eyebrow, children }: { open: boolean; compact: boolean; onClose: () => void; section: RailKey | null; eyebrow: string; children: ReactNode }) {
  // Each panel keeps its own scroll position.
  const scroll = useRef<HTMLDivElement>(null);
  const saved = useRef<Record<string, number>>({});
  const key = section ?? "none";
  useLayoutEffect(() => {
    const el = scroll.current;
    if (el) el.scrollTop = saved.current[key] ?? 0;
  }, [key, open]);
  const body = (
    <div ref={scroll} onScroll={(e) => { saved.current[key] = e.currentTarget.scrollTop; }} className={cn("min-h-0 flex-1 overflow-y-auto", compact ? "px-4 pt-3 pb-5" : "px-5 pt-4 pb-8")}>
      {section ? children : <p className="text-[13px] text-ap-muted">Click anything on the preview, or pick an item on the left, to edit it.</p>}
    </div>
  );
  if (compact) {
    if (!open) return null;
    return (
      <div role="dialog" aria-label="Settings" className="absolute inset-x-0 bottom-0 z-30 flex max-h-[60%] flex-col rounded-t-[12px] border-t border-ap-hairline bg-ap-card shadow-ap-soft">
        <DrawerHead section={section} eyebrow={eyebrow} onClose={onClose} closeIcon={<X className="size-[18px]" strokeWidth={1.7} />} />
        {body}
      </div>
    );
  }
  return (
    <aside aria-label="Settings" aria-hidden={!open} inert={!open} className={cn("shrink-0 overflow-hidden border-ap-hairline bg-ap-card transition-[width] duration-[280ms] ease-out motion-reduce:transition-none", open ? "w-[352px] border-r" : "w-0")}>
      <div className="flex h-full w-[352px] flex-col" inert={!open || undefined}>
        <DrawerHead section={section} eyebrow={eyebrow} onClose={onClose} closeIcon={<ChevronLeft className="size-[18px]" strokeWidth={1.7} />} />
        {body}
      </div>
    </aside>
  );
}

/** Canvas area: grey dot-grid panel; the preview is the largest box of the ratio that fits, centred, gliding on resize. */
export function EditCanvas({ ratio, label, children, notice, onEmptyClick }: { ratio: number; label: string; children: ReactNode; notice?: ReactNode; onEmptyClick?: () => void }) {
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
    <div ref={ref} className="ap-dot-grid relative min-h-0 flex-1 overflow-hidden rounded-[4px]">
      {notice && <div className="absolute inset-x-3 top-3 z-10 flex flex-col items-center gap-2">{notice}</div>}
      <div className="absolute inset-0 grid place-items-center" onPointerDown={(e) => { if (e.target === e.currentTarget) onEmptyClick?.(); }}>
        <div style={{ width: box.w, height: box.h }} className="transition-[width,height] duration-[280ms] ease-out motion-reduce:transition-none">{box.w > 0 && children}</div>
      </div>
      <span className="pointer-events-none absolute bottom-2.5 left-3 text-[12px] text-ap-muted nums">{label}</span>
    </div>
  );
}

export function EditTimeline({ playing, onTogglePlay, time, total, frames, children }: { playing: boolean; onTogglePlay: () => void; time: number; total: number; frames: number; children: ReactNode }) {
  return (
    <footer className="flex h-[116px] shrink-0 items-center gap-4 border-t border-ap-hairline bg-ap-card px-3 md:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <button type="button" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play"} className="grid size-10 min-h-0 min-w-0 place-items-center rounded-lg bg-ap-blue text-ap-card hover:bg-ap-blue-hover">
          {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
        <div className="hidden leading-tight sm:block">
          <div className="text-[14px] font-semibold text-ap-ink nums">{fmt(time)}</div>
          <div className="text-[12px] text-ap-muted nums">of {fmt(total)}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="hidden shrink-0 flex-col items-end gap-1 text-[12px] text-ap-muted nums md:flex">
        <span>{frames} {frames === 1 ? "frame" : "frames"} · {total.toFixed(1)} sec</span>
        <span className="flex items-center gap-2 text-[11px] text-ap-faint">
          <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-ap-dot-text" />Own headline style</span>
          <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-ap-dot-subline" />Own subline style</span>
        </span>
      </div>
    </footer>
  );
}

export { ChevronRight };
