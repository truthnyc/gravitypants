import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Check, ChevronLeft, Maximize2, Menu, Minimize2, Pause, Play, X } from "lucide-react";
import { SHOW_DIRECTORY } from "@/lib/features";
import { MobileMenu } from "@/components/MobileNavMenu";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { UserMenu } from "@/components/stillframe/UserMenu";

const LARGE_KEY = "gp.largePreview";
const LargeCtx = createContext<{ large: boolean; toggle: () => void } | null>(null);

/** Larger/smaller preview choice, kept per browser so it stays the same across all four steps. */
function useLargePreviewState() {
  const [large, setLarge] = useState(false);
  useEffect(() => { try { setLarge(localStorage.getItem(LARGE_KEY) === "1"); } catch { /* ignore */ } }, []);
  const toggle = useCallback(() => setLarge((v) => {
    const n = !v;
    try { localStorage.setItem(LARGE_KEY, n ? "1" : "0"); } catch { /* ignore */ }
    return n;
  }), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "\\" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
  return { large, toggle };
}
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { cn } from "@/lib/utils";
import { AppCard, AppSectionLabel, AppSwitch } from "./index";

export type StepKey = "photos" | "edit" | "export" | "share";
const STEPS_ALL: { key: StepKey; label: string; to: "/app/ad/$id/photos" | "/app/ad/$id/edit" | "/app/ad/$id/export" | "/app/ad/$id/share" }[] = [
  { key: "photos", label: "Photos", to: "/app/ad/$id/photos" },
  { key: "edit", label: "Edit", to: "/app/ad/$id/edit" },
  { key: "export", label: "Export", to: "/app/ad/$id/export" },
  { key: "share", label: "Share", to: "/app/ad/$id/share" },
];
const STEPS = STEPS_ALL.filter((s) => SHOW_DIRECTORY || s.key !== "share");

export type StepTitleInfo = { name: string; onRename?: ((name: string) => void) | undefined; status?: "saving" | "saved" | "error" | undefined; readOnly?: boolean | undefined };

function AdName({ title }: { title: StepTitleInfo }) {
  const { name, onRename, status, readOnly } = title;
  return (
    <div className="flex min-w-0 items-center gap-2">
      {onRename && !readOnly ? (
        <input
          key={name}
          defaultValue={name}
          aria-label="Ad name"
          className="min-w-0 max-w-[260px] truncate rounded-md bg-transparent px-1 text-[15px] font-semibold text-ap-ink outline-hidden focus:shadow-ap-focus"
          onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v && v !== name) onRename(v); else e.currentTarget.value = name; }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = name; e.currentTarget.blur(); } }}
        />
      ) : (
        <span className="min-w-0 truncate px-1 text-[15px] font-semibold text-ap-ink">{name}</span>
      )}
      {status && (
        <span className="hidden shrink-0 text-[13px] lg:inline">
          {status === "saving" ? <span className="text-ap-muted">Saving…</span> : status === "error" ? <span className="text-destructive">Not saved</span> : <span className="text-ap-green">✓ Saved</span>}
        </span>
      )}
    </div>
  );
}

function StepBar({ adId, current, className }: { adId: string; current: number; className?: string }) {
  return (
    <nav aria-label="Steps" className={cn("inline-flex shrink-0 gap-[3px] rounded-[10px] bg-ap-panel p-[3px]", className)}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <Link
            key={s.key}
            to={s.to}
            params={{ id: adId }}
            aria-current={on ? "step" : undefined}
            className={cn(
              "inline-flex min-h-0 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[13px]",
              on ? "bg-ap-card font-semibold text-ap-ink shadow-ap-soft" : "text-ap-muted hover:text-ap-ink",
            )}
          >
            <span className={cn("grid size-[18px] place-items-center rounded-full text-[11px] font-semibold nums", done ? "bg-ap-green text-ap-card" : on ? "bg-ap-blue text-ap-card" : "bg-ap-media text-ap-muted")}>
              {done ? <Check className="size-[11px]" strokeWidth={2.5} /> : i + 1}
            </span>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Ad-step header: same shell as the shared site header, with ad name and step bar. */
function StepHeader({ adId, current, title, back }: { adId: string; current: number; title: StepTitleInfo; back?: { label: string; to: "/app/ads" | "/app/ad/$id/edit" } | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const btn = useRef<HTMLButtonElement>(null);
  const was = useRef(false);
  useEffect(() => close(), [pathname, close]);
  useEffect(() => { if (was.current && !open) btn.current?.focus(); was.current = open; }, [open]);
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ap-hairline bg-ap-card/[.92] backdrop-blur-[14px] safe-top">
        <div className="relative mx-auto flex h-[63px] max-w-[1280px] items-center gap-3 px-4 md:px-6 lg:gap-4">
          <Link to="/" aria-label="Gravity Pants home" className="hidden shrink-0 lg:flex"><GravityPantsLogo size={28} showWordmark wordmarkSize={17} /></Link>
          <Link to={back?.to ?? "/app/ads"} params={{ id: adId }} className="flex min-h-0 shrink-0 items-center text-[14px] text-ap-blue hover:text-ap-blue-hover">
            <ChevronLeft className="size-4" strokeWidth={1.7} /> {back?.label ?? "Your Ads"}
          </Link>
          <AdName title={title} />
          <div className="flex-1" />
          <StepBar adId={adId} current={current} className="absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex" />
          <div className="hidden items-center gap-3 lg:flex"><HelpMenu /><UserMenu /></div>
          <button ref={btn} type="button" className="grid size-9 min-h-0 min-w-0 shrink-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
          </button>
        </div>
        <MobileMenu open={open} signedIn pathname={pathname} close={close} />
      </header>
      <div className="overflow-x-auto border-b border-ap-hairline bg-ap-card px-4 py-2 md:px-6 lg:hidden">
        <StepBar adId={adId} current={current} className="flex w-max min-w-full" />
      </div>
    </>
  );
}

/** Shared frame for the four ad steps: header with steps, sticky reel card on the left, step card on the right. */
export function StepShell({ adId, step, left, children, banner, back, title }: {
  adId: string;
  step: StepKey;
  left: ReactNode;
  children: ReactNode;
  banner?: ReactNode;
  back?: { label: string; to: "/app/ads" | "/app/ad/$id/edit" };
  title: StepTitleInfo;
}) {
  const current = STEPS.findIndex((s) => s.key === step);
  const { large, toggle } = useLargePreviewState();
  return (
    <div className="ap-flow min-h-dvh">
      <StepHeader adId={adId} current={current} title={title} back={back} />
      {banner}
      <LargeCtx.Provider value={{ large, toggle }}>
        <main className={cn("ap-steps-main mx-auto grid max-w-[1180px] items-start gap-7 px-4 pt-6 pb-20 sm:px-6 sm:pt-8", large && "ap-large")}>
          <div className="min-w-0 lg:sticky lg:top-6">{left}</div>
          <AppCard className="min-w-0">{children}</AppCard>
        </main>
      </LargeCtx.Provider>
    </div>
  );
}

export function StepTitle({ title, lead, tag }: { title: string; lead?: ReactNode; tag?: ReactNode }) {
  return (
    <div className="mb-[22px]">
      <h1 className="mb-1.5 flex flex-wrap items-center gap-2 text-[30px] font-bold tracking-[-0.03em]">{title}{tag}</h1>
      {lead && <p className="leading-normal text-ap-body">{lead}</p>}
    </div>
  );
}

export function StepActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-ap-hairline pt-5">
      {note && <p className="mr-auto text-[13px] text-ap-muted">{note}</p>}
      {children}
    </div>
  );
}

const FORMATS = ["9:16", "1:1", "16:9"] as const;

/** Left card: reel preview, play + progress, name and meta, sizes. Same on every step. */
export function ReelCard({
  preview, playing, onTogglePlay, segments, time, total, name, onRename, meta, status, formats, format, onFormat, onToggleFormat, exported, readOnly,
}: {
  preview: ReactNode;
  playing: boolean;
  onTogglePlay: () => void;
  segments: number[];
  time: number;
  total: number;
  name: string;
  onRename?: (name: string) => void;
  meta: ReactNode;
  status?: "saving" | "saved" | "error" | undefined;
  formats: string[];
  format: string;
  onFormat: (f: (typeof FORMATS)[number]) => void;
  onToggleFormat?: (f: (typeof FORMATS)[number], on: boolean) => void;
  exported?: string[];
  readOnly?: boolean;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  const lp = useContext(LargeCtx);
  let acc = 0;
  return (
    <AppCard>
      <div className="ap-preview-box relative grid h-[340px] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-[18px] bg-ap-panel p-[22px] sm:h-[380px]">
        {preview}
        {lp && (
          <button
            type="button"
            onClick={lp.toggle}
            aria-pressed={lp.large}
            title="Shortcut: \"
            className="absolute top-2.5 right-2.5 hidden items-center gap-1.5 rounded-lg bg-ap-card px-2.5 py-1.5 text-[12px] font-medium text-ap-ink shadow-ap-soft hover:text-ap-blue md:inline-flex"
          >
            {lp.large ? <Minimize2 className="size-3.5" strokeWidth={1.7} /> : <Maximize2 className="size-3.5" strokeWidth={1.7} />}
            {lp.large ? "Smaller preview" : "Larger preview"}
          </button>
        )}
      </div>
      <div className="mt-3.5 flex items-center gap-3">
        <button type="button" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play"} className="grid size-9 shrink-0 place-items-center rounded-lg bg-ap-blue text-ap-card hover:bg-ap-blue-hover">
          {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
        <div className="flex h-1 flex-1 gap-[3px]" aria-hidden>
          {segments.map((d, i) => {
            const start = acc;
            acc += d;
            const p = Math.max(0, Math.min(1, (time - start) / (d || 1)));
            return (
              <span key={i} className="relative flex-1 overflow-hidden rounded-full bg-ap-inner" style={{ flexGrow: d }}>
                <span className="absolute inset-y-0 left-0 bg-ap-blue" style={{ width: `${p * 100}%` }} />
              </span>
            );
          })}
        </div>
        <span className="text-[12px] text-ap-muted nums">{fmt(time)} / {fmt(total)}</span>
      </div>
      <div className="mt-4">
        {onRename && !readOnly ? (
          <input
            key={name}
            defaultValue={name}
            aria-label="Ad name"
            className="-mx-1 w-full rounded-md bg-transparent px-1 text-[18px] font-semibold outline-hidden focus:shadow-ap-focus"
            onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v && v !== name) onRename(v); else e.currentTarget.value = name; }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = name; e.currentTarget.blur(); } }}
          />
        ) : (
          <h3 className="text-[18px] font-semibold">{name}</h3>
        )}
        <p className="mt-1 text-[14px] text-ap-muted nums">
          {meta}
          {status && (
            <>
              {" · "}
              {status === "saving" ? "Saving…" : status === "error" ? <span className="text-destructive">Not saved — retrying</span> : <span className="text-ap-green">✓ Saved</span>}
            </>
          )}
        </p>
      </div>
      {exported ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {exported.map((e) => <span key={e} className="rounded-[10px] bg-ap-panel px-2.5 py-1.5 text-[13px] font-medium"><span className="text-ap-green">✓ </span>{e}</span>)}
        </div>
      ) : (
        <>
          <AppSectionLabel className="mt-5 mb-2">Sizes</AppSectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => {
              const on = formats.includes(f);
              const active = f === format;
              return (
                <div key={f} onClick={() => onFormat(f)} className={cn("flex cursor-pointer items-center justify-between gap-1 rounded-[10px] border bg-ap-card px-2.5 py-2", active ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onFormat(f); }} aria-pressed={active} className="flex-1 text-left text-[13px] font-medium nums">{f}</button>
                  {onToggleFormat && (
                    <span className="flex" onClick={(e) => e.stopPropagation()}><AppSwitch checked={on} disabled={readOnly} onCheckedChange={(v) => { onToggleFormat(f, v); if (!v && active) { const next = FORMATS.find((x) => x !== f && formats.includes(x)); if (next) onFormat(next); } }} aria-label={`Include ${f}`} small /></span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </AppCard>
  );
}
