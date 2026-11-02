import { clampScale, photoScale, RESET_FRAMING } from "@/lib/stillframe/framing";
import { useRef, type ReactNode } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import type { Frame, LogoSettings, TextSettings } from "@/lib/stillframe/types";
import { DEFAULT_FONT } from "@/render/renderFrame";
import { LOGO_TYPES } from "@/lib/stillframe/logo-file";
import type { InspectorActions, InspectorSection } from "./Inspector";
import { cn } from "@/lib/utils";

/** Section colour dots, shared by the rail, drawer header and toolbar. */
export const SECTION_DOT: Record<InspectorSection, string> = {
  background: "bg-ap-muted",
  photo: "bg-ap-dot-photo",
  headline: "bg-ap-dot-text",
  subline: "bg-ap-dot-subline",
  logo: "bg-ap-dot-logo",
};
export const SECTION_LABEL: Record<InspectorSection, string> = { background: "Background", photo: "Photo", headline: "Headline", subline: "Subline", logo: "Logo" };

const btn = "inline-flex h-7 min-h-0 min-w-0 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-ap-ink hover:bg-ap-panel disabled:opacity-35";
const Sep = () => <span aria-hidden className="mx-0.5 h-4 w-px bg-ap-hairline" />;

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: ReactNode; onMinus: () => void; onPlus: () => void }) {
  return (
    <span className="inline-flex items-center">
      <button type="button" className={cn(btn, "px-1.5")} aria-label={`Smaller ${label}`} onClick={onMinus}><Minus className="size-3.5" strokeWidth={1.7} /></button>
      <span className="min-w-[44px] text-center text-[12px] font-medium text-ap-ink nums">{value}</span>
      <button type="button" className={cn(btn, "px-1.5")} aria-label={`Larger ${label}`} onClick={onPlus}><Plus className="size-3.5" strokeWidth={1.7} /></button>
    </span>
  );
}

function Tag({ section }: { section: InspectorSection }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 text-[12px] font-semibold text-ap-ink">
      <span aria-hidden className={cn("size-2 rounded-full", SECTION_DOT[section])} />{SECTION_LABEL[section]}
    </span>
  );
}

/** Quick controls for the selected element. Every action goes through the same editor actions (and undo) as the drawer. */
export function EditToolbar({ section, frame, frameIndex, logo, hasLogo, actions, onOpen }: {
  section: InspectorSection | null; frame: Frame | undefined; frameIndex: number; logo: LogoSettings; hasLogo: boolean; actions: InspectorActions; onOpen: () => void;
}) {
  const logoInput = useRef<HTMLInputElement>(null);
  if (!section || !frame) return <span className="truncate text-[13px] text-ap-faint">Click anything on the preview to edit it</span>;

  let body: ReactNode = null;
  if (section === "headline" || section === "subline") {
    const isHead = section === "headline";
    const t: TextSettings = (isHead ? frame.headline : frame.subline) ?? {};
    const head = frame.headline ?? {};
    const family = t.font_family ?? (isHead ? DEFAULT_FONT : head.font_family ?? DEFAULT_FONT);
    const size = t.size_px ?? (isHead ? 108 : 48);
    const min = isHead ? 24 : 11;
    const color = t.color ?? head.color ?? "#FFFFFF";
    const own = t.same_on_all === false;
    const set = (p: Partial<TextSettings>) => actions.onText(section, p);
    body = (
      <>
        <Tag section={section} />
        <Sep />
        <button type="button" className={cn(btn, "max-w-[150px]")} onClick={onOpen} title="Change font">
          <span className="truncate text-[13px]" style={{ fontFamily: `"${family}"` }}>{family}</span>
        </button>
        <Sep />
        <Stepper label="text" value={`${size}px`} onMinus={() => set({ size_px: Math.max(min, size - 4) })} onPlus={() => set({ size_px: Math.min(240, size + 4) })} />
        <Sep />
        <button type="button" className={cn(btn, "px-1.5")} onClick={onOpen} aria-label={`Colour ${color}`}>
          <span className="size-4 rounded-full border border-ap-hairline" style={{ background: color }} />
        </button>
        <Sep />
        <button type="button" aria-pressed={own} onClick={() => (own ? actions.onMatchText?.(section) : set({ same_on_all: false }))}
          title={own ? "This frame has its own style. Click to use it on all frames." : "Click to give this frame its own style."}
          className={cn("inline-flex h-7 min-h-0 items-center rounded-lg px-2.5 text-[12px] font-medium nums", own ? "bg-ap-dot-text/12 text-ap-dot-text" : "bg-ap-panel text-ap-body hover:text-ap-ink")}>
          {own ? `Only frame ${frameIndex + 1}` : "All frames"}
        </button>
      </>
    );
  } else if (section === "photo") {
    const p = frame.photo ?? {};
    const scale = photoScale(p);
    const fit = p.fit ?? "fill";
    body = (
      <>
        <Tag section="photo" />
        <Sep />
        <button type="button" className={btn} onClick={actions.onReplacePhoto}>Replace</button>
        <Sep />
        <Stepper label="photo" value={`${scale}%`} onMinus={() => actions.onPhoto({ scale: clampScale(scale - 5) })} onPlus={() => actions.onPhoto({ scale: clampScale(scale + 5) })} />
        <Sep />
        <button type="button" className={btn} onClick={() => actions.onPhoto({ fit: fit === "fill" ? "fit" : "fill" })} title={fit === "fill" ? "Switch to Fit" : "Switch to Fill"}>
          {fit === "fill" ? "Fill" : "Fit"} <ArrowLeftRight className="size-3.5" strokeWidth={1.7} />
        </button>
        <Sep />
        <button type="button" className={btn} onClick={() => actions.onPhoto(RESET_FRAMING)}>Reset</button>
      </>
    );
  } else if (section === "logo") {
    const size = logo.size_pct ?? 16;
    body = (
      <>
        <Tag section="logo" />
        <Sep />
        <button type="button" className={btn} onClick={() => logoInput.current?.click()}>{hasLogo ? "Replace logo" : "Add logo"}</button>
        <input ref={logoInput} type="file" accept={LOGO_TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) actions.onAddLogo(f, "auto"); }} />
        {hasLogo && (<><Sep /><Stepper label="logo" value={`${size}%`} onMinus={() => actions.onLogo({ size_pct: Math.max(5, size - 2) })} onPlus={() => actions.onLogo({ size_pct: Math.min(100, size + 2) })} /></>)}
      </>
    );
  } else {
    const p = frame.photo ?? {};
    const mode = p.background ?? (p.background_color ? "solid" : "blur");
    const c = (p.background_color ?? "").toUpperCase();
    body = (
      <>
        <Tag section="background" />
        <Sep />
        <button type="button" className={btn} onClick={onOpen}>
          {mode === "solid" && c ? (<><span className="size-4 rounded-full border border-ap-hairline" style={{ background: c }} /><span className="nums">{c}</span></>) : mode === "gradient" ? "Gradient" : "Blurred photo"}
        </button>
        <Sep />
        <button type="button" className={btn} onClick={() => actions.onPhotoAll?.({ background: mode, background_color: p.background_color ?? null, background_gradient: p.background_gradient ?? null })}>Apply to all</button>
      </>
    );
  }
  return (
    <div role="toolbar" aria-label={`${SECTION_LABEL[section]} quick controls`} className="flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-ap-card px-1.5 shadow-popover">
      {body}
    </div>
  );
}
