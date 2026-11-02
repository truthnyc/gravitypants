import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Image as ImageIcon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pause, Play, Redo2, Stamp, Type, Undo2, X } from "lucide-react";
import { AdName, STEPS, StepBar, type StepTitleInfo } from "@/components/app-ui/StepShell";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type RailKey = "photo" | "text" | "logo";
const RAIL: { key: RailKey; label: string; icon: typeof ImageIcon }[] = [
  { key: "photo", label: "Photo", icon: ImageIcon },
  { key: "text", label: "Text", icon: Type },
  { key: "logo", label: "Logo", icon: Stamp },
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

export function EditRail({ value, onChange, open, onToggle, compact }: { value: RailKey; onChange: (k: RailKey) => void; open: boolean; onToggle: () => void; compact: boolean }) {
  return (
    <nav aria-label="Edit panels" className={cn("flex shrink-0 bg-ap-card", compact ? "h-14 flex-row justify-around border-t border-ap-hairline" : "w-[76px] flex-col items-center gap-1 border-r border-ap-hairline py-3")}>
      {RAIL.map(({ key, label, icon: Icon }) => {
        const on = value === key && open;
        return (
          <button key={key} type="button" aria-pressed={on} onClick={() => onChange(key)}
            className={cn("flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium", compact ? "flex-1" : "h-[60px] w-[60px]", on ? "bg-ap-soft-blue text-ap-blue" : "text-ap-muted hover:bg-ap-panel hover:text-ap-ink")}>
            <Icon className="size-5" strokeWidth={1.7} />{label}
          </button>
        );
      })}
      {!compact && (
        <button type="button" onClick={onToggle} aria-label={open ? "Hide settings" : "Show settings"} className="mt-auto grid size-10 min-h-0 min-w-0 place-items-center rounded-lg text-ap-muted hover:bg-ap-panel hover:text-ap-ink">
          {open ? <PanelLeftClose className="size-[18px]" strokeWidth={1.7} /> : <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} />}
        </button>
      )}
    </nav>
  );
}

export function EditDrawer({ open, compact, onClose, title, children }: { open: boolean; compact: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (compact) {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={`${title} settings`} className="absolute inset-x-0 bottom-0 z-30 flex max-h-[60%] flex-col rounded-t-[12px] border-t border-ap-hairline bg-ap-card shadow-ap-soft">
        <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[13px] font-semibold text-ap-ink">{title}</span>
          <button type="button" onClick={onClose} aria-label="Close settings" className="grid size-9 min-h-0 min-w-0 place-items-center rounded-lg text-ap-muted hover:bg-ap-panel"><X className="size-[18px]" strokeWidth={1.7} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    );
  }
  return (
    <aside aria-label="Settings" aria-hidden={!open} className={cn("shrink-0 overflow-hidden border-ap-hairline bg-ap-card transition-[width] duration-[280ms] ease-out motion-reduce:transition-none", open ? "w-[352px] border-r" : "w-0")}>
      <div className="h-full w-[352px] overflow-y-auto px-5 pt-4 pb-8" inert={!open || undefined}>{children}</div>
    </aside>
  );
}

/** Canvas area: grey dot-grid panel; the preview is the largest box of the ratio that fits, centred, gliding on resize. */
export function EditCanvas({ ratio, label, children, notice }: { ratio: number; label: string; children: ReactNode; notice?: ReactNode }) {
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
      <div className="absolute inset-0 grid place-items-center">
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
      <div className="hidden shrink-0 text-[12px] text-ap-muted nums md:block">{frames} {frames === 1 ? "frame" : "frames"} · {total.toFixed(1)} sec</div>
    </footer>
  );
}

export { ChevronRight };
