import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeHex, photoName, photoPalette } from "@/lib/stillframe/palette";
import { ChevronRight, Clock, Crop, Play, Image as ImageIcon, Minus, Plus, RefreshCw, Shapes, Sparkles, TextQuote, Type } from "lucide-react";
import type { EditorDoc } from "@/lib/stillframe/data";
import {
  PACE_SECONDS,
  TEXT_COLORS,
  formatSeconds,
  type BrandKit,
  type NamedBrandKit,
  type Format,
  type Frame,
  type LogoSettings,
  type Pace,
  type PhotoSettings,
  type TextSettings,
  type TransitionSettings,
} from "@/lib/stillframe/types";
import { WEIGHT_NAMES, closestWeight, loadFont, useFontList, weightsOf } from "@/lib/stillframe/fonts";
import { LOGO_TYPES, logoFileError, weightChoices } from "@/lib/stillframe/logo-file";
import { ANCHORS, DEFAULT_FONT, totalDuration } from "@/render/renderFrame";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/stillframe/FontPicker";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { ELEMENT_META, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/stillframe/media";
import { clampFrameSeconds, matchingPace, FRAME_MIN_SECONDS, FRAME_MAX_SECONDS } from "./frame-timing";

const ICONS: Record<ElementKey, typeof Type> = {
  photo: ImageIcon,
  headline: Type,
  subline: TextQuote,
  logo: Shapes,
  timing: Clock,
  transition: Sparkles,
};

export const TRANSITION_LABEL: Record<TransitionSettings["type"], string> = {
  cut: "Cut",
  fade: "Fade",
  slide: "Slide",
  zoom: "Zoom",
  wipe: "Wipe",
  dip_black: "Dip to black",
};

const pretty = (s: string) => s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function firstWords(t?: TextSettings | null) {
  const text = t?.text?.trim();
  if (!text) return "None";
  const words = text.split(/\s+/);
  return words.slice(0, 3).join(" ") + (words.length > 3 ? "…" : "");
}

export function fileName(path?: string | null) {
  if (!path) return "No photo";
  const base = path.split("/").pop() ?? path;
  return base.replace(/^[0-9a-f-]{36}-/, "");
}

export type InspectorActions = {
  onKit: (id: string | null) => void;
  onPhoto: (patch: Partial<PhotoSettings>, key?: string) => void;
  onText: (el: "headline" | "subline", patch: Partial<TextSettings>, key?: string) => void;
  onLogo: (patch: Partial<LogoSettings>, key?: string) => void;
  onLogoVisible: (visible: boolean) => void;
  onLogoVariant: (variant: "auto" | "light" | "dark") => void;
  onLogoScope: (scope: NonNullable<LogoSettings["show_on"]>) => void;
  onDuration: (seconds: number, key?: string) => void;
  sameLength: boolean;
  onSameLength: (on: boolean) => void;
  onPace: (pace: Pace) => void;
  onTransition: (patch: Partial<TransitionSettings>) => void;
  sameTransition: boolean;
  onSameTransition: (on: boolean) => void;
  onReplacePhoto: () => void;
  onAdjust: () => void;
  onAddLogo: (file: File, variant: "light" | "dark" | "auto") => void;
  /** Builds the missing logo version from the other one. */
  onMakeLogo?: (variant: "light" | "dark") => void;
  /** Live font preview on the frame while browsing the picker; null restores. */
  onFontPreview?: (p: { el: "headline" | "subline"; family: string; weight: number } | null) => void;
  /** Apply a photo patch to every frame (one undo step). */
  onPhotoAll?: (patch: Partial<PhotoSettings>, key?: string) => void;
  /** Play the current frame once on the preview. */
  onPlayFrame?: () => void;
  onUndo?: () => void;
};

export function Inspector({
  doc,
  frame,
  frameIndex,
  format,
  selected,
  kit,
  kits = [],
  kitId = null,
  onSelect,
  actions,
  mobile = false,
  embedded = false,
  hideKit = false,
  image,
  keyframe = null,
  onKeyframe = () => {},
}: {
  image?: HTMLImageElement | undefined;
  keyframe?: "start" | "end" | null;
  onKeyframe?: (k: "start" | "end" | null) => void;
  hideKit?: boolean;
  endSeconds?: number;
  doc: EditorDoc;
  frame: Frame;
  frameIndex: number;
  format: Format;
  selected: ElementKey;
  kit: BrandKit | null | undefined;
  kits?: NamedBrandKit[];
  kitId?: string | null;
  adjusting: boolean;
  onSelect: (el: ElementKey) => void;
  actions: InspectorActions;
  mobile?: boolean;
  embedded?: boolean;
}) {
  const hasLogo = Boolean(doc.project.logo.path || doc.project.logo.light_path || doc.project.logo.dark_path);
  const values: Record<ElementKey, string> = {
    photo: fileName(frame.photo?.path),
    headline: firstWords(frame.headline),
    subline: firstWords(frame.subline),
    logo: hasLogo ? pretty(doc.project.logo.positions?.[format] ?? "top-right") : "No logo yet",
    timing: `${formatSeconds(frame.duration_sec)} seconds`,
    transition: frameIndex === 0 ? "Start" : TRANSITION_LABEL[frame.transition_in?.type ?? "cut"],
  };
  const meta = ELEMENT_META[selected];
  const scope = selected === "logo" ? "Whole video" : selected === "transition" ? `Into frame ${frameIndex + 1}` : `Frame ${frameIndex + 1}`;
  const colors = [...new Set([...(kit?.colors ?? []), ...TEXT_COLORS].map((c) => c.toUpperCase()))];

  const brandName = kits.find((k) => k.id === kitId)?.name ?? "Brand";

  return (
    <aside className={cn("flex shrink-0 flex-col", embedded ? "w-full" : "overflow-y-auto bg-inspector p-4", mobile ? "h-full w-full" : embedded ? "" : "hidden w-[344px] lg:flex")}>
      {!hideKit && <BrandKitRow embedded={embedded} kits={kits} kitId={kitId} onKit={actions.onKit} />}
      {embedded ? (
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <span className="mr-auto text-[15px] font-semibold nums">Frame {frameIndex + 1} of {doc.frames.length}</span>
          <div className="flex rounded-lg bg-control-fill p-0.5" role="tablist" aria-label="What to edit">
            {(["photo", "headline", "subline", "logo"] as ElementKey[]).map((el) => {
              const m = ELEMENT_META[el];
              const active = selected === el;
              return (
                <button
                  key={el}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelect(el)}
                  className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium", active ? "bg-card shadow-segment" : "text-ap-body")}
                >
                  <span className="size-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
      <div className={cn(mobile ? "flex gap-2 overflow-x-auto pb-1" : "grid grid-cols-2 gap-2")}>
        {(["photo", "headline", "subline", "logo"] as ElementKey[]).map((el) => {
          const m = ELEMENT_META[el];
          const Icon = ICONS[el];
          const active = selected === el;
          return (
            <button
              key={el}
              type="button"
              onClick={() => onSelect(el)}
              className={cn("flex shrink-0 bg-card text-left transition-shadow rounded-sm shadow-card", mobile ? "h-11 flex-row items-center gap-2 px-3" : "flex-col items-start gap-1.5 p-2.5")}
              style={active ? { boxShadow: `0 0 0 2px ${m.color}`, background: `color-mix(in srgb, ${m.color} 7%, var(--card))` } : undefined}
            >
              <span className="flex size-[22px] items-center justify-center rounded-full" style={{ background: m.color }}>
                <Icon className="size-3 text-primary-foreground" strokeWidth={1.7} />
              </span>
              <span className="text-[13px] font-semibold leading-none">{m.label}</span>
              {!mobile && <span className="w-full truncate text-[12px] leading-tight text-secondary-text nums">{values[el]}</span>}
            </button>
          );
        })}
      </div>
      )}

      {embedded ? (
        <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-ap-body uppercase">
          {meta.label} · Frame {frameIndex + 1}
          <span className="ml-auto font-normal tracking-normal normal-case nums">{selected === "logo" ? "Whole video" : `Frame ${frameIndex + 1}`}</span>
        </div>
      ) : (
      <div className="mt-4 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[15px] font-semibold">{meta.label}</span>
        <span className="ml-auto text-[12px] text-secondary-text nums">{scope}</span>
      </div>
      )}

      <div className={cn("mt-3 space-y-4", embedded ? "" : "rounded-sm bg-card p-4 shadow-card")}>
        {selected === "photo" && (
          <PhotoPanel
            photo={frame.photo ?? {}}
            frameIndex={frameIndex}
            hasWords={Boolean(frame.headline?.text?.trim() || frame.subline?.text?.trim())}
            brandName={brandName}
            brandColors={(kit?.colors ?? []).map((c) => c.toUpperCase())}
            image={image}
            keyframe={keyframe}
            onKeyframe={onKeyframe}
            actions={actions}
          />
        )}
        {(selected === "headline" || selected === "subline") && (
          <TextPanel key={selected} el={selected} text={frame[selected]} brandColors={(kit?.colors ?? []).map((c) => c.toUpperCase())} brandName={brandName} logoPath={doc.project.logo.dark_path ?? doc.project.logo.light_path ?? doc.project.logo.path ?? null} actions={actions} onChange={(p, k) => actions.onText(selected, p, k)} />
        )}
        {selected === "logo" && (
          <LogoPanel logo={doc.project.logo} format={format} frame={frame} frameIndex={frameIndex} hasLogo={hasLogo} actions={actions} />
        )}
      </div>
    </aside>
  );
}

/* ---------------- Brand kit */

function BrandKitRow({ kits, kitId, onKit, embedded }: { kits: NamedBrandKit[]; kitId: string | null; onKit: (id: string | null) => void; embedded?: boolean }) {
  const current = kits.find((k) => k.id === kitId);
  return (
    <div className={cn("mb-3 flex items-center gap-3", embedded ? "mb-4 rounded-[14px] bg-ap-panel px-4 py-2.5" : "rounded-sm bg-card px-3 py-2 shadow-card")}>
      <span className="text-[13px] font-semibold">Brand kit</span>
      {kits.length ? (
        <select
          aria-label="Brand kit"
          value={current?.id ?? ""}
          onChange={(e) => onKit(e.target.value || null)}
          className={cn("ml-auto min-w-0 max-w-[60%] truncate", embedded ? "h-10 rounded-[12px] border border-ap-hairline bg-ap-card px-3 text-[14px]" : "h-11 rounded-sm bg-control-fill px-2 text-[16px] lg:h-8 lg:text-[13px]")}
        >
          <option value="">None</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      ) : (
        <Link to="/app/brand" className="ml-auto flex h-11 items-center text-[13px] font-medium text-link lg:h-8">Create a brand kit</Link>
      )}
    </div>
  );
}

/* ---------------- shared controls */

export function Field({ label, value, children }: { label: string; value?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-[12px] font-medium text-secondary-text">
        <span>{label}</span>
        {value !== undefined && <span className="text-foreground nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-control-fill p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-7 flex-1 rounded-lg px-1 text-[12px] font-medium", value === o.value && "bg-card shadow-segment")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Slider whose live drag coalesces into a single undo step, committed on release. */
export function ElementSlider({
  name,
  color,
  min,
  max,
  step = 1,
  value,
  onChange,
  left,
  right,
  snap,
}: {
  name: string;
  color: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number, key: string) => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** Adjusts the released value (e.g. snap to center); the result joins the same undo step. */
  snap?: (v: number) => number;
}) {
  const session = useRef(0);
  return (
    <div className="flex items-center gap-2.5">
      {left}
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        aria-label={name}
        style={{ "--slider-color": color } as React.CSSProperties}
        onValueChange={([v]) => onChange(v ?? value, `drag:${name}:${session.current}`)}
        onValueCommit={([v]) => {
          if (snap && v !== undefined) {
            const s = snap(v);
            if (s !== v) onChange(s, `drag:${name}:${session.current}`);
          }
          session.current += 1;
        }}
      />
      {right}
    </div>
  );
}

function PositionGrid({ value, color, onChange }: { value: string; color: string; onChange: (a: string) => void }) {
  return (
    <div className="grid w-[96px] grid-cols-3 gap-1 rounded-sm bg-control-fill p-1">
      {ANCHORS.map((a) => (
        <button
          key={a}
          type="button"
          aria-label={pretty(a)}
          aria-pressed={value === a}
          onClick={() => onChange(a)}
          className="flex size-7 min-h-0 min-w-0 items-center justify-center rounded-sm hover:bg-card"
          style={value === a ? { background: color } : undefined}
        >
          <span className={cn("size-2 rounded-full", value === a ? "bg-primary-foreground" : "bg-secondary-text/40")} />
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-[13px]">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-toggle-on" />
    </label>
  );
}

/* ---------------- Photo */

const MOVEMENTS: { value: NonNullable<PhotoSettings["movement"]>; label: string }[] = [
  { value: "none", label: "None" },
  { value: "slow_zoom_in", label: "Zoom in" },
  { value: "slow_zoom_out", label: "Zoom out" },
  { value: "pan_left", label: "Pan left" },
  { value: "pan_right", label: "Pan right" },
  { value: "pan_up", label: "Pan up" },
  { value: "pan_down", label: "Pan down" },
  { value: "custom", label: "Custom" },
];
const INTENSITIES: { value: NonNullable<PhotoSettings["movement_intensity"]>; label: string }[] = [
  { value: "subtle", label: "Subtle" },
  { value: "standard", label: "Standard" },
  { value: "dramatic", label: "Dramatic" },
];
const NEUTRALS = ["#000000", "#1D1D1F", "#8E8E93", "#D1D1D6", "#F5F5F0", "#FFFFFF"];
const RECENT_KEY = "sf-recent-bg-colors";

/** Collapses with grid rows 0fr/1fr; hidden content is inert. */
export function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!open} aria-hidden={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ApplyAll({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-medium text-secondary-text">
      Apply to all frames
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-toggle-on" />
    </label>
  );
}

function Swatch({ c, active, onPick }: { c: string; active: boolean; onPick: (c: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Background ${c}`}
      aria-pressed={active}
      onClick={() => onPick(c)}
      className={cn("size-7 rounded-full border border-border", active && "ring-2 ring-primary ring-offset-2")}
      style={{ background: c }}
    />
  );
}

function PhotoPanel({
  photo,
  frameIndex,
  hasWords,
  brandName,
  brandColors,
  image,
  keyframe,
  onKeyframe,
  actions,
}: {
  photo: PhotoSettings;
  frameIndex: number;
  hasWords: boolean;
  brandName: string;
  brandColors: string[];
  image?: HTMLImageElement | undefined;
  keyframe: "start" | "end" | null;
  onKeyframe: (k: "start" | "end" | null) => void;
  actions: InspectorActions;
}) {
  const brightness = Math.round(Number(photo.brightness ?? 0) * 200);
  const fit = photo.fit ?? "fill";
  const move = photo.movement ?? "none";
  const bgMode = photo.background ?? (photo.background_color ? "solid" : "blur");
  const bg = (photo.background_color ?? "").toUpperCase();
  const [allBg, setAllBg] = useState(false);
  const [allMove, setAllMove] = useState(false);
  const [look, setLook] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [hex, setHex] = useState(bg);
  const [hexBad, setHexBad] = useState(false);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 4)); } catch { /* ignore */ }
  }, []);
  useEffect(() => { setHex(bg); setHexBad(false); }, [bg]);
  const palette = useMemo(() => photoPalette(photo.path, image), [photo.path, image]);
  const moved = Boolean((photo.zoom ?? 1) !== 1 || (photo.focus && (photo.focus.x !== 0.5 || photo.focus.y !== 0.5)));
  const name = photoName(photo, frameIndex);

  const send = (patch: Partial<PhotoSettings>, all: boolean, key?: string) =>
    all && actions.onPhotoAll ? actions.onPhotoAll(patch, key) : actions.onPhoto(patch, key);

  const pickBackground = (patch: Partial<PhotoSettings>, key?: string) => {
    const switching = fit !== "fit";
    send(switching ? { ...patch, fit: "fit" } : patch, allBg, key);
    if (switching) toast(`Frame ${frameIndex + 1} switched to Fit so the background shows`, actions.onUndo ? { action: { label: "Undo", onClick: actions.onUndo } } : undefined);
  };
  const pickColor = (c: string, key?: string) => {
    pickBackground({ background: "solid", background_color: c }, key);
    const all = [...NEUTRALS, ...palette, ...brandColors];
    if (!all.includes(c)) {
      const next = [c, ...recent.filter((x) => x !== c)].slice(0, 4);
      setRecent(next);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };
  const chooseMove = (m: NonNullable<PhotoSettings["movement"]>) => {
    const patch: Partial<PhotoSettings> = m === "custom"
      ? { movement: "custom", zoom_start: photo.zoom_start ?? 1, zoom_end: photo.zoom_end ?? 1.1, pan_x: photo.pan_x ?? 0 }
      : { movement: m };
    send(patch, allMove);
    if (m === "custom") onKeyframe("start");
    else {
      onKeyframe(null);
      if (m !== "none") actions.onPlayFrame?.();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="size-[72px] shrink-0 overflow-hidden rounded-sm bg-control-fill">
          {photo.path && <MediaImage path={photo.path} className="size-full object-cover" alt="" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{name}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-secondary-text">Drag on the preview to reposition · scroll to zoom</div>
          {moved && (
            <button type="button" className="mt-1 text-[12px] font-medium text-link" onClick={() => actions.onPhoto({ focus: { x: 0.5, y: 0.5 }, zoom: 1 })}>
              Reset framing
            </button>
          )}
        </div>
        <Button variant="default" size="sm" onClick={actions.onReplacePhoto}>Replace</Button>
      </div>

      <Field label="Fill the frame">
        <Segmented
          value={fit}
          options={[
            { value: "fill", label: "Fill (crop to fit)" },
            { value: "fit", label: "Fit (show whole photo)" },
          ]}
          onChange={(v) => actions.onPhoto({ fit: v })}
        />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-secondary-text">Background</span>
          <ApplyAll
            checked={allBg}
            onChange={(v) => {
              setAllBg(v);
              if (v) actions.onPhotoAll?.({ fit: photo.fit ?? "fill", background: bgMode, background_color: photo.background_color ?? null });
            }}
          />
        </div>
        {fit === "fill" && (
          <p className="text-[12px] leading-snug text-secondary-text">Shows around the photo when it's set to Fit. Picking a background switches this frame to Fit.</p>
        )}
        <Segmented
          value={bgMode}
          options={[
            { value: "blur", label: "Blurred photo" },
            { value: "solid", label: "Solid colour" },
          ]}
          onChange={(v) => pickBackground(v === "solid" ? { background: "solid", background_color: photo.background_color || "#1D1D1F" } : { background: "blur" })}
        />
        {bgMode === "blur" && <p className="text-[12px] text-secondary-text">Soft, matches the photo.</p>}
        <Reveal open={bgMode === "solid"}>
          <div className="space-y-3 pt-1">
            {palette.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[12px] text-secondary-text">From this photo</div>
                <div className="flex flex-wrap gap-2">{palette.map((c) => <Swatch key={c} c={c} active={bg === c} onPick={pickColor} />)}</div>
              </div>
            )}
            {brandColors.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[12px] text-secondary-text">{brandName} brand colours</div>
                <div className="flex flex-wrap gap-2">{brandColors.map((c) => <Swatch key={c} c={c} active={bg === c} onPick={pickColor} />)}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="text-[12px] text-secondary-text">Neutrals &amp; recent</div>
              <div className="flex flex-wrap items-center gap-2">
                {[...NEUTRALS, ...recent.filter((c) => !NEUTRALS.includes(c))].map((c) => <Swatch key={c} c={c} active={bg === c} onPick={pickColor} />)}
                <CustomColor onPick={(c) => pickColor(c, "drag:photo-bg")} />
                <input
                  aria-label="Hex colour"
                  aria-invalid={hexBad}
                  value={hex}
                  onChange={(e) => {
                    setHex(e.target.value);
                    const n = normalizeHex(e.target.value);
                    setHexBad(!n && e.target.value.trim() !== "");
                    if (n) pickColor(n, "drag:photo-hex");
                  }}
                  placeholder="#1D1D1F"
                  className={cn("h-8 w-[92px] rounded-sm border bg-card px-2 text-[13px] uppercase nums", hexBad ? "border-destructive" : "border-ap-hairline")}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-secondary-text">Movement</span>
          <ApplyAll
            checked={allMove}
            onChange={(v) => {
              setAllMove(v);
              if (v) actions.onPhotoAll?.({ movement: move, movement_intensity: photo.movement_intensity ?? "standard", zoom_start: photo.zoom_start ?? 1, zoom_end: photo.zoom_end ?? 1, pan_x: photo.pan_x ?? 0, pan_y: photo.pan_y ?? 0 });
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENTS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => chooseMove(m.value)}
              aria-pressed={move === m.value}
              className={cn("mv-chip flex h-8 items-center gap-1.5 rounded-lg pl-1 pr-2.5 text-[12px] font-medium", move === m.value ? "bg-el-photo text-primary-foreground" : "bg-control-fill")}
            >
              <span className="mv-thumb size-6 overflow-hidden rounded-sm bg-card" data-mv={m.value}>
                {photo.path && <MediaImage path={photo.path} className="size-full object-cover" alt="" />}
              </span>
              {m.label}
            </button>
          ))}
        </div>
        <Reveal open={move !== "none" && move !== "custom"}>
          <div className="pt-1">
            <Field label="Amount">
              <Segmented value={photo.movement_intensity ?? "standard"} options={INTENSITIES} onChange={(v) => { send({ movement_intensity: v }, allMove); actions.onPlayFrame?.(); }} />
            </Field>
          </div>
        </Reveal>
        <Reveal open={move === "custom"}>
          <div className="space-y-2 pt-1">
            <Segmented
              value={keyframe ?? "start"}
              options={[
                { value: "start", label: "Start framing" },
                { value: "end", label: "End framing" },
              ]}
              onChange={(v) => onKeyframe(v)}
            />
            <p className="text-[12px] leading-snug text-secondary-text">Drag and zoom the photo on the preview to set where the movement starts and where it ends.</p>
            <Button variant="default" size="sm" onClick={() => { onKeyframe(null); actions.onPlayFrame?.(); }}>
              <Play strokeWidth={1.7} /> Preview movement
            </Button>
          </div>
        </Reveal>
      </div>

      <div>
        <button type="button" aria-expanded={look} onClick={() => setLook((v) => !v)} className="flex w-full items-center gap-1 text-[12px] font-medium text-secondary-text">
          <ChevronRight className={cn("size-3.5 transition-transform motion-reduce:transition-none", look && "rotate-90")} strokeWidth={1.7} /> Adjust
        </button>
        <Reveal open={look}>
          <div className="space-y-4 pt-3">
            <Field label="Brightness" value={brightness > 0 ? `+${brightness}` : brightness}>
              <ElementSlider
                name="Brightness"
                color="var(--el-photo)"
                min={-40}
                max={40}
                value={Math.max(-40, Math.min(40, brightness))}
                snap={(v) => (Math.abs(v) <= 2 ? 0 : v)}
                onChange={(v, k) => actions.onPhoto({ brightness: v / 200 }, k)}
              />
            </Field>
            {hasWords && (
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-[13px]">Darken for text</span>
                  <span className="block text-[12px] text-secondary-text">Keeps words readable on bright photos</span>
                </span>
                <Switch checked={Boolean(photo.darken_for_text)} onCheckedChange={(v) => actions.onPhoto({ darken_for_text: v, darken_set: true })} className="data-[state=checked]:bg-toggle-on" />
              </label>
            )}
          </div>
        </Reveal>
      </div>
    </>
  );
}

function CustomColor({ onPick }: { onPick: (c: string) => void }) {
  return (
    <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-placeholder-border text-icon lg:size-7" aria-label="Custom color">
      <Plus className="size-3.5" strokeWidth={1.7} />
      <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => onPick(e.target.value.toUpperCase())} />
    </label>
  );
}

/* ---------------- Headline / Subline */

const ANIMATIONS: { value: NonNullable<TextSettings["animation"]>; label: string }[] = [
  { value: "none", label: "None" },
  { value: "rise", label: "Rise up" },
  { value: "fade", label: "Fade in" },
  { value: "pop", label: "Pop" },
  { value: "typewriter", label: "Typewriter" },
];

const TEXT_SWATCHES = ["#FFFFFF", "#000000", "#FFD60A", "#FF9F0A", "#0A84FF", "#BF5AF2"];
const RECENT_TEXT = "sf-recent-text-colors";

function TextPanel({
  el,
  text,
  brandColors,
  brandName,
  logoPath,
  actions,
  onChange,
}: {
  el: "headline" | "subline";
  text: TextSettings | null;
  brandColors: string[];
  brandName: string;
  logoPath: string | null;
  actions: InspectorActions;
  onChange: (patch: Partial<TextSettings>, key?: string) => void;
}) {
  const isHead = el === "headline";
  const t = text ?? {};
  const color = "var(--accent-blue)";
  const size = t.size_px ?? (isHead ? 108 : 48);
  const family = t.font_family ?? DEFAULT_FONT;
  const weight = t.font_weight ?? (isHead ? 700 : 500);
  const under = t.keep_under_headline ?? true;
  const current = (t.color ?? "#FFFFFF").toUpperCase();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_TEXT) ?? "[]").slice(0, 4)); } catch { /* ignore */ }
  }, []);
  const base = [...brandColors, ...TEXT_SWATCHES];
  const swatches = [...new Set([...base, ...recent, ...(base.includes(current) || recent.includes(current) ? [] : [current])])];
  const spacing = t.letter_spacing ?? 0;
  const lineHeight = t.line_height ?? (isHead ? 1.08 : 1.25);
  const imageMode = !isHead && t.mode === "image";
  const imgSize = t.image_size_pct ?? 30;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dropErr, setDropErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const { data: fontList } = useFontList();
  const weights = weightChoices(weightsOf(fontList?.fonts.find((f) => f.family === family)));

  const uploadBadge = async (file: File) => {
    const err = logoFileError(file);
    setDropErr(err);
    if (err) return;
    setBusy(true);
    try {
      const up = await uploadMedia(file, "logo");
      onChange({ image_path: up.path });
    } catch {
      toast.error("That image couldn't be uploaded. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!isHead && (
        <Field label="Show">
          <Segmented
            value={imageMode ? "image" : "text"}
            options={[
              { value: "text", label: "Text" },
              { value: "image", label: "Logo / Badge" },
            ]}
            onChange={(v) => onChange({ mode: v as "text" | "image" })}
          />
        </Field>
      )}
      <Reveal open={!imageMode}>
        <div className="space-y-4">
          <Field label="Text">
            <Textarea
              value={t.text ?? ""}
              placeholder={isHead ? "Add a headline" : "Add a line under the headline"}
              onChange={(e) => onChange({ text: e.target.value }, `${el}-text`)}
              className="min-h-[72px] rounded-sm text-[15px]"
            />
          </Field>
          <Field label="Font">
            <FontPicker
              title={isHead ? "Headline font" : "Subline font"}
              family={family}
              weight={weight}
              brandName={brandName}
              sampleText={t.text ?? ""}
              onPreview={(f, w) => actions.onFontPreview?.(f ? { el, family: f, weight: w } : null)}
              onChange={(f, w) => onChange({ font_family: f, font_weight: w })}
            >
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-sm border bg-card px-3 text-left text-[14px]"
                aria-label={`Font: ${family}`}
              >
                <span className="truncate" style={{ fontFamily: `"${family}"`, fontWeight: weight }}>
                  {family} · {WEIGHT_NAMES[weight] ?? weight}
                </span>
                <ChevronRight className="size-3.5 text-secondary-text" strokeWidth={1.7} />
              </button>
            </FontPicker>
            {weights.length > 1 && (
              <div className="pt-1.5">
                <Segmented
                  value={String(closestWeight(weights, weight))}
                  options={weights.map((w) => ({ value: String(w), label: WEIGHT_NAMES[w] ?? String(w) }))}
                  onChange={(v) => {
                    const w = Number(v);
                    void loadFont(family, w).then(() => onChange({ font_weight: w }));
                    onChange({ font_weight: w });
                  }}
                />
              </div>
            )}
          </Field>
          <Field label="Size" value={`${size} px`}>
            <ElementSlider
              name={`${isHead ? "Headline" : "Subline"} size`}
              color={color}
              min={24}
              max={240}
              value={size}
              onChange={(v, k) => onChange({ size_px: v }, k)}
              left={<span className="text-[11px] font-semibold text-secondary-text">A</span>}
              right={<span className="text-[19px] font-semibold text-secondary-text">A</span>}
            />
          </Field>
          <Field label="Letter spacing" value={`${spacing > 0 ? "+" : ""}${spacing}`}>
            <ElementSlider
              name={`${isHead ? "Headline" : "Subline"} letter spacing`}
              color={color}
              min={-10}
              max={50}
              value={spacing}
              snap={(v) => (Math.abs(v) <= 1 ? 0 : v)}
              onChange={(v, k) => onChange({ letter_spacing: v }, k)}
            />
          </Field>
          <Field label="Line height" value={lineHeight.toFixed(2)}>
            <ElementSlider
              name={`${isHead ? "Headline" : "Subline"} line height`}
              color={color}
              min={80}
              max={200}
              value={Math.round(lineHeight * 100)}
              onChange={(v, k) => onChange({ line_height: v / 100 }, k)}
            />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap items-center gap-2">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={current === c}
                  onClick={() => onChange({ color: c })}
                  className={cn("size-8 rounded-full border border-border lg:size-7", current === c && "ring-2 ring-offset-2")}
                  style={{ background: c, ["--tw-ring-color" as string]: color }}
                />
              ))}
              <CustomColor
                onPick={(c) => {
                  if (!base.includes(c)) {
                    const next = [c, ...recent.filter((x) => x !== c)].slice(0, 4);
                    setRecent(next);
                    try { localStorage.setItem(RECENT_TEXT, JSON.stringify(next)); } catch { /* ignore */ }
                  }
                  onChange({ color: c }, `drag:${el}-color`);
                }}
              />
            </div>
          </Field>
        </div>
      </Reveal>
      <Reveal open={imageMode}>
        <div className="space-y-4">
          {t.image_path ? (
            <div className="flex items-center gap-3 rounded-sm border border-ap-hairline p-2.5">
              <span className="checker flex h-12 w-20 items-center justify-center rounded-sm">
                <MediaImage path={t.image_path} alt="Badge" className="max-h-10 max-w-[90%] object-contain" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">Badge</span>
              <Button size="sm" variant="default" disabled={busy} onClick={() => fileRef.current?.click()}>Replace</Button>
              <button type="button" className="text-[12px] text-destructive" onClick={() => onChange({ image_path: null })}>Remove</button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) void uploadBadge(f); }}
              className={cn("rounded-sm border border-dashed p-4 text-center", over ? "border-primary bg-primary/5" : "border-placeholder-border")}
            >
              <p className="text-[13px] font-medium">Drop a badge or second logo…</p>
              <p className="mt-1 text-[12px] text-secondary-text">e.g. "New season", a partner logo or an award · PNG or SVG · up to 5 MB</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button size="sm" variant="default" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Uploading…" : "Choose a file"}</Button>
                {logoPath && <Button size="sm" variant="plain" onClick={() => onChange({ image_path: logoPath })}>Use my logo</Button>}
              </div>
            </div>
          )}
          {dropErr && <p className="text-[12px] text-destructive">{dropErr}</p>}
          <input
            ref={fileRef}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadBadge(file);
            }}
          />
          <Reveal open={Boolean(t.image_path)}>
            <Field label="Size" value={`${imgSize}% of width`}>
              <ElementSlider name="Subline image size" color={color} min={5} max={100} value={imgSize} onChange={(v, k) => onChange({ image_size_pct: v }, k)} />
            </Field>
          </Reveal>
        </div>
      </Reveal>
      <Field label="Animation">
        <div className="flex flex-wrap gap-1.5">
          {ANIMATIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => { onChange({ animation: a.value }); if (a.value !== "none") actions.onPlayFrame?.(); }}
              aria-pressed={(t.animation ?? "none") === a.value}
              className={cn("h-7 rounded-lg px-2.5 text-[12px] font-medium", (t.animation ?? "none") !== a.value && "bg-control-fill")}
              style={(t.animation ?? "none") === a.value ? { background: color, color: "var(--on-accent)" } : undefined}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Field>
      {!isHead && (
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[13px]">Keep under headline</span>
            <span className="block text-[12px] text-secondary-text">Moves with the headline</span>
          </span>
          <Switch checked={under} onCheckedChange={(v) => onChange({ keep_under_headline: v })} className="data-[state=checked]:bg-toggle-on" />
        </label>
      )}
      <Reveal open={isHead || !under}>
        <Field label="Position">
          <div className="flex items-center gap-3">
            <PositionGrid value={t.position ?? (isHead ? "center" : "bottom-center")} color={color} onChange={(a) => onChange({ position: a })} />
            <p className="text-[12px] leading-snug text-secondary-text">Or drag it on the preview — it snaps into place. Use the corner handle to resize.</p>
          </div>
        </Field>
      </Reveal>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[13px]">Same on all frames</span>
          <span className="block text-[12px] text-secondary-text">Style changes apply to every frame. Words stay per frame.</span>
        </span>
        <Switch
          checked={Boolean(t.same_on_all)}
          onCheckedChange={(v) => {
            onChange({ same_on_all: v });
            if (v) toast(`${isHead ? "Headline" : "Subline"} style copied to every frame`, actions.onUndo ? { action: { label: "Undo", onClick: actions.onUndo } } : undefined);
          }}
          className="data-[state=checked]:bg-toggle-on"
        />
      </label>
    </>
  );
}

/* ---------------- Logo */

function LogoFileRow({ label, path, onUpload, onRemove, onMake, makeLabel }: { label: string; path: string | null | undefined; onUpload: () => void; onRemove: () => void; onMake?: (() => void) | undefined; makeLabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-ap-hairline p-2.5">
      <span className="checker flex h-11 w-16 shrink-0 items-center justify-center rounded-sm">
        {path && <MediaImage path={path} alt="" className="max-h-9 max-w-[90%] object-contain" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block truncate text-[12px] text-secondary-text">{path ? photoName({ path }, 0).replace(/^Photo 1$/, "Uploaded") : "Not added yet"}</span>
      </span>
      {path ? (
        <>
          <Button size="sm" variant="default" onClick={onUpload}>Replace</Button>
          <button type="button" className="text-[12px] text-destructive" onClick={onRemove}>Remove</button>
        </>
      ) : (
        <>
          <Button size="sm" variant="default" onClick={onUpload}>Upload</Button>
          {onMake && <button type="button" className="text-[12px] font-medium text-link" onClick={onMake}>{makeLabel}</button>}
        </>
      )}
    </div>
  );
}

function LogoPanel({
  logo,
  format,
  frame,
  frameIndex,
  hasLogo,
  actions,
}: {
  logo: LogoSettings;
  format: Format;
  frame: Frame;
  frameIndex: number;
  hasLogo: boolean;
  actions: InspectorActions;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<"auto" | "light" | "dark">("auto");
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const posScopeState = useState<"all" | "frame" | null>(null);
  const pick = (v: "auto" | "light" | "dark") => { target.current = v; fileRef.current?.click(); };
  const take = (f: File | undefined) => {
    if (!f) return;
    const e = logoFileError(f);
    setErr(e);
    if (!e) actions.onAddLogo(f, target.current);
  };
  const input = (
    <input ref={fileRef} type="file" accept={LOGO_TYPES.join(",")} className="hidden" onChange={(e) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      take(f);
    }} />
  );
  if (!hasLogo) {
    return (
      <>
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); target.current = "auto"; take(e.dataTransfer.files?.[0]); }}
          className={cn("flex flex-col items-center rounded-sm border border-dashed px-4 py-6 text-center", over ? "border-primary bg-primary/5" : "border-placeholder-border")}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-control-fill">
            <Shapes className="size-5 text-el-logo" strokeWidth={1.7} />
          </span>
          <p className="mt-3 text-[14px] font-semibold">Drop your logo here or <button type="button" className="text-link" onClick={() => pick("auto")}>choose a file</button></p>
          <p className="mt-1 max-w-[300px] text-[12px] text-secondary-text">PNG or SVG with a transparent background works best · up to 5 MB. We'll tell if it's a light or dark logo.</p>
        </div>
        {err && <p className="text-[12px] text-destructive">{err}</p>}
        {input}
      </>
    );
  }
  const size = logo.size_pct ?? 16;
  const ownPos = Boolean(logo.frame_positions?.[frame.id]?.[format]);
  const posScope = posScopeState[0] ?? (ownPos ? "frame" : "all");
  const setPosScope = posScopeState[1];
  const version = frame.logo_variant ?? logo.version ?? "auto";
  const show = logo.show_on ?? "all";
  const light = logo.light_path;
  const dark = logo.dark_path ?? (logo.path && logo.path !== light ? logo.path : null);
  const tiles: { value: NonNullable<LogoSettings["version"]>; label: string; hint: string; bg: string; path: string | null | undefined }[] = [
    { value: "auto", label: "Auto", hint: "Best contrast", bg: "logo-split", path: dark ?? light },
    { value: "light", label: "Light logo", hint: "For dark photos", bg: "bg-foreground", path: light },
    { value: "dark", label: "Dark logo", hint: "For light photos", bg: "bg-background", path: dark },
  ];
  const clearFormat = () => Object.fromEntries(Object.entries(logo.frame_positions ?? {}).map(([k, v]) => { const { [format]: _x, ...rest } = v; return [k, rest]; }));
  return (
    <>
      <Field label="Version">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => {
            const disabled = !t.path;
            return (
              <button
                key={t.value}
                type="button"
                disabled={disabled}
                aria-pressed={version === t.value}
                onClick={() => actions.onLogoVariant(t.value)}
                className={cn("flex flex-col items-center gap-1 rounded-sm p-2 text-center disabled:opacity-40", version === t.value ? "ring-2 ring-primary" : "ring-1 ring-border")}
              >
                <span className={cn("flex h-10 w-full items-center justify-center rounded-sm border border-ap-hairline", t.bg)}>
                  {t.path && <MediaImage path={t.path} className="max-h-6 max-w-[80%] object-contain" alt="" />}
                </span>
                <span className="text-[12px] font-medium leading-tight">{t.label}</span>
                <span className="text-[10px] leading-tight text-secondary-text">{t.hint}</span>
              </button>
            );
          })}
        </div>
        {(!light || !dark) && (
          <p className="text-[12px] text-secondary-text">{!dark ? "Add a dark version so Auto can switch on light photos." : "Add a light version so Auto can switch on dark photos."}</p>
        )}
      </Field>
      <div className="space-y-2">
        <LogoFileRow label="Light logo" path={light} onUpload={() => pick("light")} onRemove={() => actions.onLogo({ light_path: null, path: dark ?? null })} onMake={dark ? () => actions.onMakeLogo?.("light") : undefined} makeLabel="Make from your dark logo" />
        <LogoFileRow label="Dark logo" path={dark} onUpload={() => pick("dark")} onRemove={() => actions.onLogo({ dark_path: null, path: light ?? null })} onMake={light ? () => actions.onMakeLogo?.("dark") : undefined} makeLabel="Make from your light logo" />
        {err && <p className="text-[12px] text-destructive">{err}</p>}
        {input}
      </div>
      <Field label={`Position on ${format.replace("x", ":")}`}>
        <PositionGrid
          value={logo.frame_positions?.[frame.id]?.[format] ?? logo.positions?.[format] ?? "top-right"}
          color="var(--accent-blue)"
          onChange={(a) => {
            if (posScope === "frame") {
              const fp = logo.frame_positions ?? {};
              actions.onLogo({ frame_positions: { ...fp, [frame.id]: { ...fp[frame.id], [format]: a } } });
            } else {
              actions.onLogo({ positions: { ...logo.positions, [format]: a }, frame_positions: clearFormat() });
            }
          }}
        />
        <div className="mt-2"><Segmented value={posScope} options={[{ value: "all", label: "All frames" }, { value: "frame", label: "This frame" }]} onChange={setPosScope} /></div>
        {ownPos && (
          <p className="text-[12px] text-secondary-text">
            Frame {frameIndex + 1} has its own position ·{" "}
            <button
              type="button"
              className="font-medium text-link"
              onClick={() => {
                const fp = logo.frame_positions ?? {};
                const { [format]: _x, ...rest } = fp[frame.id] ?? {};
                actions.onLogo({ frame_positions: { ...fp, [frame.id]: rest } });
                setPosScope("all");
              }}
            >
              Use the same as other frames
            </button>
          </p>
        )}
      </Field>
      <Field label="Size" value={`${size}% of width`}>
        <ElementSlider
          name="Logo size"
          color="var(--accent-blue)"
          min={5}
          max={100}
          value={size}
          onChange={(v, k) => actions.onLogo({ size_pct: v }, k)}
          left={<span className="size-2.5 rounded-[2px] bg-secondary-text/50" />}
          right={<span className="size-4 rounded-[3px] bg-secondary-text/50" />}
        />
      </Field>
      <Field label="See-through">
        <Segmented
          value={logo.opacity ?? "solid"}
          options={[
            { value: "solid", label: "Solid" },
            { value: "soft", label: "Soft (70% opacity)" },
          ]}
          onChange={(v) => actions.onLogo({ opacity: v })}
        />
      </Field>
      <Field label="Show logo on">
        <Segmented
          value={show}
          options={[
            { value: "all", label: "All frames" },
            { value: "first_last", label: "First & last" },
            { value: "selected", label: "Choose frames" },
          ]}
          onChange={(v) => actions.onLogoScope(v)}
        />
        <Reveal open={show === "selected"}>
          <div className="pt-2"><ToggleRow label={`Show on frame ${frameIndex + 1}`} checked={frame.logo_visible} onChange={actions.onLogoVisible} /></div>
        </Reveal>
      </Field>
      <Button
        variant="destructive-plain"
        size="sm"
        className="w-full"
        onClick={() => {
          actions.onLogo({ path: null, light_path: null, dark_path: null, asset_id: null });
          toast("Logo removed", actions.onUndo ? { action: { label: "Undo", onClick: actions.onUndo } } : undefined);
        }}
      >
        Remove logo
      </Button>
    </>
  );
}

/* ---------------- Timing */

export function TimingPanel({ frames, frame, actions, endSeconds }: { frames: Frame[]; frame: Frame; actions: InspectorActions; endSeconds: number }) {
  const d = frame.duration_sec;
  const same = actions.sameLength;
  const pace = matchingPace(frames);
  const set = (v: number) => actions.onDuration(clampFrameSeconds(v));
  return (
    <>
      <Field label="Show this frame for">
        <div className="flex items-center justify-between">
          <Button variant="default" size="icon" aria-label="Shorter" onClick={() => set(d - 0.5)} disabled={d <= FRAME_MIN_SECONDS}>
            <Minus strokeWidth={1.7} />
          </Button>
          <div className="text-center">
            <span className="text-[34px] font-semibold tracking-[-0.02em] nums">{formatSeconds(d)}</span>
            <span className="ml-1 text-[13px] text-secondary-text">seconds</span>
          </div>
          <Button variant="default" size="icon" aria-label="Longer" onClick={() => set(d + 0.5)} disabled={d >= FRAME_MAX_SECONDS}>
            <Plus strokeWidth={1.7} />
          </Button>
        </div>
        <ElementSlider name="Frame length" color="var(--ap-blue)" min={FRAME_MIN_SECONDS} max={FRAME_MAX_SECONDS} step={0.5} value={d} onChange={(v, k) => actions.onDuration(clampFrameSeconds(v), k)} />
      </Field>
      <Field label="Pace for the whole video">
        <Segmented
          value={pace ?? ("" as Pace)}
          options={[
            { value: "relaxed", label: "Relaxed" },
            { value: "standard", label: "Standard" },
            { value: "fast", label: "Fast" },
          ]}
          onChange={actions.onPace}
        />
        <p className="text-[11px] text-secondary-text nums">Relaxed 3.5s · Standard 2.5s · Fast 1.5s per frame</p>
      </Field>
      <div className="flex items-center justify-between rounded-sm bg-control-fill px-3 py-2.5 text-[13px]">
        <span className="text-secondary-text">Total video length</span>
        <span className="font-semibold nums">{formatSeconds(totalDuration(frames) + endSeconds)} seconds</span>
      </div>
      <ToggleRow label="Same length for all frames" checked={same} onChange={actions.onSameLength} />
    </>
  );
}

/* ---------------- Transition */

const TR_ANIM: Record<TransitionSettings["type"], string> = {
  cut: "tr-cut",
  fade: "tr-fade",
  slide: "tr-slide",
  zoom: "tr-zoom",
  wipe: "tr-wipe",
  dip_black: "tr-dip-b",
};

export function TransitionPanel({ frames, frame, first, actions }: { frames: Frame[]; frame: Frame; first: boolean; actions: InspectorActions }) {
  if (first) {
    return (
      <p className="py-2 text-center text-[13px] text-secondary-text">The first frame starts the video.</p>
    );
  }
  const tr = frame.transition_in ?? { type: "cut", speed: "smooth" };
  const rest = frames.slice(1);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TRANSITION_LABEL) as TransitionSettings["type"][]).map((type) => (
          <Button variant="ghost"
            key={type}
            type="button"
            data-type={type}
            aria-pressed={tr.type === type}
            onClick={() => actions.onTransition({ type })}
            className={cn("tr-tile h-auto min-w-0 flex flex-col items-center gap-1.5 rounded-sm p-1.5", tr.type === type ? "ring-2 ring-primary" : "ring-1 ring-border")}
            style={{ "--tr-anim": TR_ANIM[type] } as React.CSSProperties}
          >
            <span className="relative block h-12 w-full overflow-hidden rounded-[3px] bg-ap-panel">
              <span className="tr-b absolute inset-0 bg-ap-blue" />
              {type === "dip_black" && <span className="tr-k absolute inset-0 bg-foreground" />}
            </span>
            <span className="text-[11px] font-medium">{TRANSITION_LABEL[type]}</span>
          </Button>
        ))}
      </div>
      <Field label="Speed">
        <Segmented
          value={tr.speed}
          options={[
            { value: "smooth", label: "Smooth" },
            { value: "quick", label: "Quick" },
          ]}
          onChange={(v) => actions.onTransition({ speed: v })}
        />
      </Field>
      <ToggleRow label="Use for all frames" checked={actions.sameTransition} onChange={actions.onSameTransition} />
    </>
  );
}
