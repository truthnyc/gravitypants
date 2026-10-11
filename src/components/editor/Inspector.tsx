import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeHex, photoName, photoPalette } from "@/lib/stillframe/palette";
import { ChevronDown, ChevronRight, Clock, Crop, Play, Image as ImageIcon, Minus, Plus, RefreshCw, Shapes, Sparkles, TextQuote, Type } from "lucide-react";
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
  const brandColors = (kit?.colors ?? []).map((c) => c.toUpperCase());
  void values; void scope; void colors; void meta; void mobile;
  const tab: "photo" | "text" | "logo" = selected === "logo" ? "logo" : selected === "headline" || selected === "subline" ? "text" : "photo";
  const TABS: { key: typeof tab; label: string; el: ElementKey }[] = [
    { key: "photo", label: "Photo", el: "photo" },
    { key: "text", label: "Text", el: "headline" },
    { key: "logo", label: "Logo", el: "logo" },
  ];

  return (
    <aside className={cn("flex shrink-0 flex-col", embedded ? "w-full" : "overflow-y-auto bg-inspector p-4")}>
      {!hideKit && <BrandKitRow embedded={embedded} kits={kits} kitId={kitId} onKit={actions.onKit} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[15px] font-semibold nums">Frame {frameIndex + 1} of {doc.frames.length}</div>
        <div className="flex gap-1 rounded-lg bg-ap-panel p-1" role="tablist" aria-label="What to edit">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => onSelect(t.el)}
              className={cn("flex min-h-9 items-center gap-2 rounded-lg px-4 text-[15px] transition-colors", tab === t.key ? "bg-ap-card text-ap-ink shadow-[var(--ap-shadow-soft)]" : "text-ap-body hover:text-ap-ink")}
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", t.key === "photo" ? "bg-ap-dot-photo" : t.key === "text" ? "bg-ap-dot-text" : "bg-ap-dot-logo")} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("mt-4 space-y-4", embedded ? "" : "rounded-sm bg-card p-4 shadow-card")}>
        {tab === "photo" && (
          <PhotoPanel
            photo={frame.photo ?? {}}
            frameIndex={frameIndex}
            brandName={brandName}
            brandColors={brandColors}
            image={image}
            keyframe={keyframe}
            onKeyframe={onKeyframe}
            actions={actions}
          />
        )}
        {tab === "text" && (
          <TextTab headline={frame.headline} subline={frame.subline} brandColors={brandColors} brandName={brandName} actions={actions} />
        )}
        {tab === "logo" && (
          <LogoPanel
            logo={doc.project.logo}
            format={format}
            frame={frame}
            frameIndex={frameIndex}
            hasLogo={hasLogo}
            actions={actions}
            kitName={kits.find((k) => k.id === kitId)?.name ?? null}
            kitPosition={kit?.default_logo_positions?.[format] ?? null}
          />
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

/** One scope control per tab: "Style changes apply to: This frame | All frames". */
function ScopeControl({ value, onChange }: { value: "frame" | "all"; onChange: (v: "frame" | "all") => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ap-hairline pt-4">
      <span className="text-[13px] text-ap-body">Style changes apply to:</span>
      <div className="w-[220px]"><Segmented value={value} options={[{ value: "frame", label: "This frame" }, { value: "all", label: "All frames" }]} onChange={onChange} /></div>
    </div>
  );
}

function Collapse({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex items-center gap-1 text-[13px] font-medium text-ap-blue">
        {label} <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} strokeWidth={1.7} />
      </button>
      <Reveal open={open}><div className="space-y-4 pt-3">{children}</div></Reveal>
    </div>
  );
}


function PhotoPanel({
  photo,
  frameIndex,
  brandName,
  brandColors,
  image,
  keyframe,
  onKeyframe,
  actions,
}: {
  photo: PhotoSettings;
  frameIndex: number;
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
  // Photo and movement default to this frame only.
  const [scope, setScope] = useState<"frame" | "all">("frame");
  const all = scope === "all";
  const [adjust, setAdjust] = useState(move === "custom");
  const [recent, setRecent] = useState<string[]>([]);
  const [hex, setHex] = useState(bg);
  const [hexBad, setHexBad] = useState(false);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 4)); } catch { /* ignore */ }
  }, []);
  useEffect(() => { setHex(bg); setHexBad(false); }, [bg]);
  const palette = useMemo(() => photoPalette(photo.path, image), [photo.path, image]);
  const moved = Boolean((photo.zoom ?? 1) !== 1 || (photo.focus && (photo.focus.x !== 0.5 || photo.focus.y !== 0.5)));

  const send = (patch: Partial<PhotoSettings>, key?: string) =>
    all && actions.onPhotoAll ? actions.onPhotoAll(patch, key) : actions.onPhoto(patch, key);

  const pickColor = (c: string, key?: string) => {
    send({ background: "solid", background_color: c }, key);
    const known = [...NEUTRALS, ...palette, ...brandColors];
    if (!known.includes(c)) {
      const next = [c, ...recent.filter((x) => x !== c)].slice(0, 4);
      setRecent(next);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };
  const chooseMove = (m: NonNullable<PhotoSettings["movement"]>) => {
    const patch: Partial<PhotoSettings> = m === "custom"
      ? { movement: "custom", zoom_start: photo.zoom_start ?? 1, zoom_end: photo.zoom_end ?? 1.1, pan_x: photo.pan_x ?? 0 }
      : { movement: m };
    send(patch);
    if (m === "custom") onKeyframe("start");
    else {
      onKeyframe(null);
      if (m !== "none") actions.onPlayFrame?.();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-sm bg-control-fill">
          {photo.path && <MediaImage path={photo.path} className="size-full object-cover" alt="" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold nums">Photo {frameIndex + 1}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-secondary-text">Drag on the preview to reposition · scroll to zoom</div>
          {moved && (
            <button type="button" className="mt-1 text-[12px] font-medium text-link" onClick={() => actions.onPhoto({ focus: { x: 0.5, y: 0.5 }, zoom: 1 })}>
              Reset framing
            </button>
          )}
        </div>
        <Button variant="default" size="sm" onClick={actions.onReplacePhoto}>Replace</Button>
      </div>

      <Field label="Fit">
        <Segmented value={fit} options={[{ value: "fill", label: "Fill" }, { value: "fit", label: "Fit" }]} onChange={(v) => send({ fit: v })} />
      </Field>

      {fit === "fit" && (
        <Field label="Background">
          <Segmented
            value={bgMode}
            options={[{ value: "blur", label: "Blurred" }, { value: "solid", label: "Solid" }]}
            onChange={(v) => send(v === "solid" ? { background: "solid", background_color: photo.background_color || "#1D1D1F" } : { background: "blur" })}
          />
          <Reveal open={bgMode === "solid"}>
            <div className="space-y-3 pt-2">
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
        </Field>
      )}

      <Field label="Movement">
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENTS.filter((m) => m.value !== "custom").map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => chooseMove(m.value)}
              aria-pressed={move === m.value}
              className={cn("h-9 rounded-lg px-4 text-[14px] font-medium", move === m.value ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-ink hover:bg-ap-segment-hover")}
            >
              {m.label}
            </button>
          ))}
          {move === "custom" && <span className="inline-flex h-9 items-center rounded-lg bg-ap-blue px-4 text-[14px] font-medium text-ap-card">Custom</span>}
        </div>
        <Reveal open={move !== "none" && move !== "custom"}>
          <div className="pt-2">
            <Field label="Amount">
              <Segmented value={photo.movement_intensity ?? "standard"} options={INTENSITIES} onChange={(v) => { send({ movement_intensity: v }); actions.onPlayFrame?.(); }} />
            </Field>
          </div>
        </Reveal>
      </Field>

      <ScopeControl
        value={scope}
        onChange={(v) => {
          setScope(v);
          if (v === "all") actions.onPhotoAll?.({ fit, background: bgMode, background_color: photo.background_color ?? null, movement: move, movement_intensity: photo.movement_intensity ?? "standard", zoom_start: photo.zoom_start ?? 1, zoom_end: photo.zoom_end ?? 1, pan_x: photo.pan_x ?? 0, pan_y: photo.pan_y ?? 0 });
        }}
      />

      <Collapse label="Adjust" open={adjust} onToggle={() => setAdjust((v) => !v)}>
        <Field label="Custom movement">
          <Button variant={move === "custom" ? "default" : "plain"} size="sm" onClick={() => chooseMove("custom")} aria-pressed={move === "custom"}>
            {move === "custom" ? "Custom movement on" : "Set a custom movement"}
          </Button>
          <Reveal open={move === "custom"}>
            <div className="space-y-2 pt-2">
              <Segmented value={keyframe ?? "start"} options={[{ value: "start", label: "Start framing" }, { value: "end", label: "End framing" }]} onChange={(v) => onKeyframe(v)} />
              <p className="text-[12px] leading-snug text-secondary-text">Drag and zoom the photo on the preview to set where the movement starts and where it ends.</p>
              <Button variant="default" size="sm" onClick={() => { onKeyframe(null); actions.onPlayFrame?.(); }}>
                <Play strokeWidth={1.7} /> Preview movement
              </Button>
            </div>
          </Reveal>
        </Field>
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
      </Collapse>
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
const ACCENT = "var(--accent-blue)";

function FontField({ el, t, brandName, actions, onChange }: { el: "headline" | "subline"; t: TextSettings; brandName: string; actions: InspectorActions; onChange: (p: Partial<TextSettings>, k?: string) => void }) {
  const family = t.font_family ?? DEFAULT_FONT;
  const weight = t.font_weight ?? (el === "headline" ? 700 : 500);
  return (
    <Field label="Font">
      <FontPicker
        title={el === "headline" ? "Headline font" : "Subline font"}
        family={family}
        weight={weight}
        brandName={brandName}
        sampleText={t.text ?? ""}
        onPreview={(f, w) => actions.onFontPreview?.(f ? { el, family: f, weight: w } : null)}
        onChange={(f, w) => onChange({ font_family: f, font_weight: w })}
      >
        <button type="button" className="flex h-9 w-full items-center justify-between rounded-sm border bg-card px-3 text-left text-[14px]" aria-label={`Font: ${family}`}>
          <span className="truncate" style={{ fontFamily: `"${family}"`, fontWeight: weight }}>{family}</span>
          <ChevronRight className="size-3.5 text-secondary-text" strokeWidth={1.7} />
        </button>
      </FontPicker>
    </Field>
  );
}

function SizeField({ el, t, onChange }: { el: "headline" | "subline"; t: TextSettings; onChange: (p: Partial<TextSettings>, k?: string) => void }) {
  const isHead = el === "headline";
  const size = t.size_px ?? (isHead ? 108 : 48);
  return (
    <Field label="Size" value={`${size} px`}>
      <ElementSlider
        name={`${isHead ? "Headline" : "Subline"} size`}
        color={ACCENT}
        min={isHead ? 24 : 11}
        max={240}
        value={size}
        onChange={(v, k) => onChange({ size_px: v }, k)}
        left={<span className="text-[11px] font-semibold text-secondary-text">A</span>}
        right={<span className="text-[19px] font-semibold text-secondary-text">A</span>}
      />
    </Field>
  );
}

function ColorField({ el, t, brandColors, onChange }: { el: "headline" | "subline"; t: TextSettings; brandColors: string[]; onChange: (p: Partial<TextSettings>, k?: string) => void }) {
  const current = (t.color ?? "#FFFFFF").toUpperCase();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_TEXT) ?? "[]").slice(0, 4)); } catch { /* ignore */ }
  }, []);
  const base = [...brandColors, ...TEXT_SWATCHES];
  const swatches = [...new Set([...base, ...recent, ...(base.includes(current) || recent.includes(current) ? [] : [current])])];
  return (
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
            style={{ background: c, ["--tw-ring-color" as string]: ACCENT }}
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
  );
}

function AnimationField({ value, onPick }: { value: NonNullable<TextSettings["animation"]>; onPick: (a: NonNullable<TextSettings["animation"]>) => void }) {
  return (
    <Field label="Animation">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Animation">
        {ANIMATIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={value === a.value}
            onClick={() => onPick(a.value)}
            className={cn("h-9 rounded-lg px-4 text-[14px] font-medium", value === a.value ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-ink hover:bg-ap-segment-hover")}
          >
            {a.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Text tab: headline and subline together, with one scope control at the bottom. */
function TextTab({ headline, subline, brandColors, brandName, actions }: { headline: TextSettings | null; subline: TextSettings | null; brandColors: string[]; brandName: string; actions: InspectorActions }) {
  const h = headline ?? {};
  const s = subline ?? {};
  const [moreHead, setMoreHead] = useState(false);
  const [moreSub, setMoreSub] = useState(false);
  const setH = (p: Partial<TextSettings>, k?: string) => actions.onText("headline", p, k);
  // A new subline starts from the headline's font and colour.
  const setS = (p: Partial<TextSettings>, k?: string) =>
    actions.onText("subline", subline ? p : { font_family: h.font_family ?? DEFAULT_FONT, color: h.color ?? "#FFFFFF", ...p }, k);
  const play = (fn: (p: Partial<TextSettings>) => void, a: NonNullable<TextSettings["animation"]>) => { fn({ animation: a }); if (a !== "none") actions.onPlayFrame?.(); };
  const family = h.font_family ?? DEFAULT_FONT;
  const weight = h.font_weight ?? 700;
  const { data: fontList } = useFontList();
  const weights = weightChoices(weightsOf(fontList?.fonts.find((f) => f.family === family)));
  const spacing = h.letter_spacing ?? 0;
  const lineHeight = h.line_height ?? 1.08;
  const under = s.keep_under_headline ?? true;
  const shared = (headline?.same_on_all ?? true) && (!subline || (subline.same_on_all ?? true));
  return (
    <>
      <div className="text-[14px] font-semibold">Headline</div>
      <Textarea value={h.text ?? ""} placeholder="Add a headline" aria-label="Headline" onChange={(e) => setH({ text: e.target.value }, "headline-text")} className="min-h-[72px] rounded-sm text-[15px]" />
      <FontField el="headline" t={h} brandName={brandName} actions={actions} onChange={setH} />
      <SizeField el="headline" t={h} onChange={setH} />
      <ColorField el="headline" t={h} brandColors={brandColors} onChange={setH} />
      <AnimationField value={h.animation ?? "none"} onPick={(a) => play(setH, a)} />
      <Collapse label="More text options" open={moreHead} onToggle={() => setMoreHead((v) => !v)}>
        {weights.length > 1 && (
          <Field label="Weight">
            <Segmented
              value={String(closestWeight(weights, weight))}
              options={weights.map((w) => ({ value: String(w), label: WEIGHT_NAMES[w] ?? String(w) }))}
              onChange={(v) => { const w = Number(v); void loadFont(family, w).then(() => setH({ font_weight: w })); setH({ font_weight: w }); }}
            />
          </Field>
        )}
        <Field label="Letter spacing" value={`${spacing > 0 ? "+" : ""}${spacing}`}>
          <ElementSlider name="Headline letter spacing" color={ACCENT} min={-10} max={50} value={spacing} snap={(v) => (Math.abs(v) <= 1 ? 0 : v)} onChange={(v, k) => setH({ letter_spacing: v }, k)} />
        </Field>
        <Field label="Line height" value={lineHeight.toFixed(2)}>
          <ElementSlider name="Headline line height" color={ACCENT} min={80} max={200} value={Math.round(lineHeight * 100)} onChange={(v, k) => setH({ line_height: v / 100 }, k)} />
        </Field>
        <Field label="Position">
          <div className="flex items-center gap-3">
            <PositionGrid value={h.position ?? "center"} color={ACCENT} onChange={(a) => setH({ position: a })} />
            <p className="text-[12px] leading-snug text-secondary-text">Or drag it on the preview. It snaps into place.</p>
          </div>
        </Field>
      </Collapse>

      <div className="border-t border-ap-hairline pt-4 text-[14px] font-semibold">Subline <span className="font-normal text-ap-muted">· optional</span></div>
      <Textarea value={s.text ?? ""} placeholder="Add a line under the headline" aria-label="Subline" onChange={(e) => setS({ text: e.target.value }, "subline-text")} className="min-h-[56px] rounded-sm text-[15px]" />
      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px]">Keep under headline</span>
        <Switch checked={under} onCheckedChange={(v) => setS({ keep_under_headline: v })} className="data-[state=checked]:bg-toggle-on" />
      </label>
      <AnimationField value={subline ? s.animation ?? "none" : "fade"} onPick={(a) => play(setS, a)} />
      <Collapse label="Customize subline style" open={moreSub} onToggle={() => setMoreSub((v) => !v)}>
        <FontField el="subline" t={{ ...s, font_family: s.font_family ?? h.font_family ?? null }} brandName={brandName} actions={actions} onChange={setS} />
        <SizeField el="subline" t={s} onChange={setS} />
        <ColorField el="subline" t={{ ...s, color: s.color ?? h.color ?? "#FFFFFF" }} brandColors={brandColors} onChange={setS} />
        {!under && (
          <Field label="Position">
            <PositionGrid value={s.position ?? "bottom-center"} color={ACCENT} onChange={(a) => setS({ position: a })} />
          </Field>
        )}
      </Collapse>

      <ScopeControl
        value={shared ? "all" : "frame"}
        onChange={(v) => {
          const on = v === "all";
          if (headline) actions.onText("headline", { same_on_all: on });
          if (subline) actions.onText("subline", { same_on_all: on });
          if (on) toast("Text style copied to every frame", actions.onUndo ? { action: { label: "Undo", onClick: actions.onUndo } } : undefined);
        }}
      />
    </>
  );
}


/* ---------------- Logo */

function LogoPanel({
  logo,
  format,
  frame,
  frameIndex,
  hasLogo,
  actions,
  kitName,
  kitPosition,
}: {
  logo: LogoSettings;
  format: Format;
  frame: Frame;
  frameIndex: number;
  hasLogo: boolean;
  actions: InspectorActions;
  kitName: string | null;
  kitPosition: string | null;
}) {
  const on = logo.enabled !== false;
  const size = logo.size_pct ?? 16;
  const version = frame.logo_variant ?? logo.version ?? "auto";
  const show = logo.show_on ?? "all";
  const light = logo.light_path;
  const dark = logo.dark_path ?? (logo.path && logo.path !== light ? logo.path : null);
  const files = light && dark ? "Light + Dark" : dark ? "Dark only" : light ? "Light only" : "No logo yet";
  const clearFormat = () => Object.fromEntries(Object.entries(logo.frame_positions ?? {}).map(([k, v]) => { const { [format]: _x, ...rest } = v; return [k, rest]; }));
  return (
    <>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[14px] font-semibold">Show logo</span>
          <span className="block text-[12px] text-secondary-text">Applies to the whole video. Logo files live in your Brand Kit.</span>
        </span>
        <Switch checked={on} onCheckedChange={(v) => actions.onLogo({ enabled: v })} className="data-[state=checked]:bg-toggle-on" />
      </label>
      {on && (
        <>
          {hasLogo && (
            <>
              <Field label={`Position on ${format}`}>
                <PositionGrid
                  value={logo.frame_positions?.[frame.id]?.[format] ?? logo.positions?.[format] ?? kitPosition ?? "top-right"}
                  color={ACCENT}
                  onChange={(a) => actions.onLogo({ positions: { ...logo.positions, [format]: a }, frame_positions: clearFormat() })}
                />
              </Field>
              <Field label="Size" value={`${size}% of width`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ElementSlider name="Logo size" color={ACCENT} min={5} max={100} value={size} onChange={(v, k) => actions.onLogo({ size_pct: v }, k)} />
                  </div>
                </div>
              </Field>
              <Field label="See-through">
                <Segmented value={logo.opacity ?? "solid"} options={[{ value: "solid", label: "Solid" }, { value: "soft", label: "Soft" }]} onChange={(v) => actions.onLogo({ opacity: v })} />
              </Field>
              <Field label="Show on">
                <Segmented
                  value={show}
                  options={[{ value: "all", label: "All frames" }, { value: "first_last", label: "First & last" }, { value: "selected", label: "Choose frames" }]}
                  onChange={(v) => actions.onLogoScope(v)}
                />
                <Reveal open={show === "selected"}>
                  <div className="pt-2"><ToggleRow label={`Show on frame ${frameIndex + 1}`} checked={frame.logo_visible} onChange={actions.onLogoVisible} /></div>
                </Reveal>
              </Field>
            </>
          )}
          <Field label="Logo file">
            <div className="rounded-sm border border-ap-hairline p-3">
              <div className="flex items-center gap-3">
                <span className="checker flex h-11 w-16 shrink-0 items-center justify-center rounded-sm">
                  {(dark ?? light) && <MediaImage path={(dark ?? light)!} alt="" className="max-h-9 max-w-[90%] object-contain" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{kitName ?? "No brand kit"}</span>
                  <span className="block text-[12px] text-secondary-text">{files}</span>
                </span>
                <Link to="/app/brand" className="shrink-0 text-[13px] font-medium text-ap-blue">{hasLogo ? "Edit in Brand Kit ›" : "Add one in Brand Kit"}</Link>
              </div>
              {hasLogo && (
                <div className="mt-3 space-y-2">
                  <Segmented
                    value={version}
                    options={[{ value: "auto", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
                    onChange={(v) => {
                      if ((v === "light" && !light) || (v === "dark" && !dark)) return;
                      actions.onLogoVariant(v);
                    }}
                  />
                  {!light && dark && (
                    <button type="button" className="text-[12px] font-medium text-link" onClick={() => actions.onMakeLogo?.("light")}>Make from dark logo</button>
                  )}
                </div>
              )}
            </div>
          </Field>
        </>
      )}
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
