import { useRef, useState } from "react";
import { ChevronRight, Clock, Crop, Image as ImageIcon, Minus, Plus, Shapes, Sparkles, TextQuote, Type } from "lucide-react";
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
import { WEIGHT_NAMES } from "@/lib/stillframe/fonts";
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
  onDuration: (seconds: number, key?: string) => void;
  onSameLength: (on: boolean) => void;
  onPace: (pace: Pace) => void;
  onTransition: (patch: Partial<TransitionSettings>) => void;
  onTransitionAll: () => void;
  onReplacePhoto: () => void;
  onAdjust: () => void;
  onAddLogo: (file: File) => void;
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
  adjusting,
  onSelect,
  actions,
  endSeconds = 0,
  mobile = false,
}: {
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

  return (
    <aside className={cn("flex shrink-0 flex-col overflow-y-auto bg-inspector p-4", mobile ? "h-full w-full" : "hidden w-[344px] lg:flex")}>
      <BrandKitRow kits={kits} kitId={kitId} onKit={actions.onKit} />
      <div className={cn(mobile ? "flex gap-2 overflow-x-auto pb-1" : "grid grid-cols-3 gap-2")}>
        {(Object.keys(ELEMENT_META) as ElementKey[]).map((el) => {
          const m = ELEMENT_META[el];
          const Icon = ICONS[el];
          const active = selected === el;
          return (
            <button
              key={el}
              type="button"
              onClick={() => onSelect(el)}
              className={cn("flex shrink-0 rounded-sm bg-card text-left shadow-card transition-shadow", mobile ? "h-11 flex-row items-center gap-2 px-3" : "flex-col items-start gap-1.5 p-2.5")}
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

      <div className="mt-4 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[15px] font-semibold">{meta.label}</span>
        <span className="ml-auto text-[12px] text-secondary-text nums">{scope}</span>
      </div>

      <div className="mt-3 space-y-4 rounded-sm bg-card p-4 shadow-card">
        {selected === "photo" && <PhotoPanel photo={frame.photo ?? {}} adjusting={adjusting} actions={actions} />}
        {(selected === "headline" || selected === "subline") && (
          <TextPanel key={selected} el={selected} text={frame[selected]} colors={colors} onChange={(p, k) => actions.onText(selected, p, k)} />
        )}
        {selected === "logo" && (
          <LogoPanel logo={doc.project.logo} format={format} frame={frame} hasLogo={hasLogo} kit={kit} actions={actions} />
        )}
        {selected === "timing" && <TimingPanel frames={doc.frames} frame={frame} actions={actions} endSeconds={endSeconds} />}
        {selected === "transition" && <TransitionPanel frames={doc.frames} frame={frame} first={frameIndex === 0} actions={actions} />}
      </div>
    </aside>
  );
}

/* ---------------- Brand kit */

function BrandKitRow({ kits, kitId, onKit }: { kits: NamedBrandKit[]; kitId: string | null; onKit: (id: string | null) => void }) {
  const current = kits.find((k) => k.id === kitId);
  return (
    <div className="mb-3 flex items-center gap-3 rounded-sm bg-card px-3 py-2 shadow-card">
      <span className="text-[13px] font-semibold">Brand kit</span>
      {kits.length ? (
        <select
          aria-label="Brand kit"
          value={current?.id ?? ""}
          onChange={(e) => onKit(e.target.value || null)}
          className="ml-auto h-11 min-w-0 max-w-[60%] truncate rounded-sm bg-control-fill px-2 text-[16px] lg:h-8 lg:text-[13px]"
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
          className="flex size-7 items-center justify-center rounded-sm hover:bg-card"
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
  { value: "slow_zoom_in", label: "Slow zoom in" },
  { value: "slow_zoom_out", label: "Slow zoom out" },
  { value: "pan_left", label: "Pan left" },
  { value: "pan_right", label: "Pan right" },
  { value: "custom", label: "Custom" },
];
const INTENSITIES: { value: NonNullable<PhotoSettings["movement_intensity"]>; label: string }[] = [
  { value: "subtle", label: "Subtle" },
  { value: "standard", label: "Standard" },
  { value: "dramatic", label: "Dramatic" },
];
const BG_COLORS = ["#000000", "#1D1D1F", "#FFFFFF", "#F1F3F0"];

function PhotoPanel({ photo, adjusting, actions }: { photo: PhotoSettings; adjusting: boolean; actions: InspectorActions }) {
  const brightness = Math.round(Number(photo.brightness ?? 0) * 200);
  const fit = photo.fit ?? "fill";
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-sm bg-control-fill">
          {photo.path && <MediaImage path={photo.path} className="size-full object-cover" alt="" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{fileName(photo.path)}</div>
          <Button variant="plain" size="sm" className="-ml-2 mt-0.5" onClick={actions.onReplacePhoto}>
            Replace Photo
          </Button>
        </div>
      </div>
      <Field label="Fill the frame">
        <Segmented
          value={fit}
          options={[
            { value: "fill", label: "Fill" },
            { value: "fit", label: "Fit" },
          ]}
          onChange={(v) => actions.onPhoto({ fit: v })}
        />
      </Field>
      {fit === "fit" && (
        <Field label="Background color">
          <div className="flex items-center gap-2">
            {BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Background ${c}`}
                onClick={() => actions.onPhoto({ background_color: c })}
                className={cn("size-8 rounded-full border border-border lg:size-7", (photo.background_color ?? "").toUpperCase() === c && "ring-2 ring-primary ring-offset-2")}
                style={{ background: c }}
              />
            ))}
            <CustomColor onPick={(c) => actions.onPhoto({ background_color: c }, "drag:photo-bg")} />
          </div>
        </Field>
      )}
      {fit === "fill" && (
        <Field label="Crop & focus">
          <Button variant={adjusting ? "primary" : "default"} size="sm" onClick={actions.onAdjust}>
            <Crop strokeWidth={1.7} /> {adjusting ? "Done" : "Adjust…"}
          </Button>
        </Field>
      )}
      <Field label="Movement">
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENTS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() =>
                actions.onPhoto(
                  m.value === "custom"
                    ? {
                        movement: "custom",
                        zoom_start: photo.zoom_start ?? 1,
                        zoom_end: photo.zoom_end ?? 1.1,
                        pan_x: photo.pan_x ?? 0,
                      }
                    : { movement: m.value },
                )
              }
              aria-pressed={move === m.value}
              className={cn(
                "h-7 rounded-lg px-2.5 text-[12px] font-medium",
                move === m.value ? "bg-el-photo text-primary-foreground" : "bg-control-fill",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      {move !== "none" && move !== "custom" && (
        <Field label="Amount">
          <Segmented
            value={photo.movement_intensity ?? "standard"}
            options={INTENSITIES}
            onChange={(v) => actions.onPhoto({ movement_intensity: v })}
          />
        </Field>
      )}
      {move === "custom" && (
        <>
          <Field label="Start size" value={`${zoomStart}%`}>
            <ElementSlider
              name="Start size"
              color="var(--el-photo)"
              min={100}
              max={150}
              value={zoomStart}
              snap={(v) => (v <= 103 ? 100 : v)}
              onChange={(v, k) => actions.onPhoto({ zoom_start: v / 100 }, k)}
            />
          </Field>
          <Field label="End size" value={`${zoomEnd}%`}>
            <ElementSlider
              name="End size"
              color="var(--el-photo)"
              min={100}
              max={150}
              value={zoomEnd}
              snap={(v) => (v <= 103 ? 100 : v)}
              onChange={(v, k) => actions.onPhoto({ zoom_end: v / 100 }, k)}
            />
          </Field>
          <Button
            variant="default"
            size="sm"
            onClick={() => actions.onPhoto({ zoom_start: zoomEnd / 100, zoom_end: zoomStart / 100 })}
          >
            <RefreshCw strokeWidth={1.7} /> Reverse
          </Button>
          <Field label="Move sideways">
            <Segmented
              value={panDir}
              options={[
                { value: "none", label: "None" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(v) =>
                actions.onPhoto({ pan_x: v === "none" ? 0 : (v === "left" ? -1 : 1) * (panAmount / 100 || 0.5) })
              }
            />
          </Field>
          {panDir !== "none" && (
            <Field label="Distance" value={`${panAmount}%`}>
              <ElementSlider
                name="Pan distance"
                color="var(--el-photo)"
                min={10}
                max={100}
                value={panAmount}
                onChange={(v, k) => actions.onPhoto({ pan_x: (panDir === "left" ? -1 : 1) * (v / 100) }, k)}
              />
            </Field>
          )}
        </>
      )}
      <Field label="Brightness" value={brightness > 0 ? `+${brightness}` : brightness}>
        <ElementSlider
          name="Brightness"
          color="var(--el-photo)"
          min={-100}
          max={100}
          value={brightness}
          snap={(v) => (Math.abs(v) <= 5 ? 0 : v)}
          onChange={(v, k) => actions.onPhoto({ brightness: v / 200 }, k)}
        />
      </Field>
      <ToggleRow label="Darken for text" checked={Boolean(photo.darken_for_text)} onChange={(v) => actions.onPhoto({ darken_for_text: v })} />
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

function TextPanel({
  el,
  text,
  colors,
  onChange,
}: {
  el: "headline" | "subline";
  text: TextSettings | null;
  colors: string[];
  onChange: (patch: Partial<TextSettings>, key?: string) => void;
}) {
  const isHead = el === "headline";
  const t = text ?? {};
  const color = isHead ? "var(--el-headline)" : "var(--el-subline)";
  const size = t.size_px ?? (isHead ? 108 : 48);
  const family = t.font_family ?? DEFAULT_FONT;
  const weight = t.font_weight ?? (isHead ? 700 : 500);
  const under = t.keep_under_headline ?? true;
  const current = (t.color ?? "#FFFFFF").toUpperCase();
  const [extra, setExtra] = useState<string[]>([]);
  const swatches = [...new Set([...colors.map((c) => c.toUpperCase()), ...extra, ...(colors.map((c) => c.toUpperCase()).includes(current) ? [] : [current])])];

  return (
    <>
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
          onChange={(f, w) => onChange({ font_family: f, font_weight: w })}
        >
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-sm border bg-card px-3 text-left text-[14px]"
            aria-label={`Font: ${family}`}
          >
            <span className="truncate" style={{ fontFamily: `"${family}"`, fontWeight: weight }}>
              {family}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-secondary-text">
              {WEIGHT_NAMES[weight] ?? weight}
              <ChevronRight className="size-3.5" strokeWidth={1.7} />
            </span>
          </button>
        </FontPicker>
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
      <Field label="Color">
        <div className="flex flex-wrap items-center gap-2">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => onChange({ color: c })}
              className={cn("size-8 rounded-full border border-border lg:size-7", current === c && "ring-2 ring-offset-2")}
              style={{ background: c, ["--tw-ring-color" as string]: color }}
            />
          ))}
          <CustomColor
            onPick={(c) => {
              setExtra((x) => (x.includes(c) ? x : [...x, c]));
              onChange({ color: c }, `drag:${el}-color`);
            }}
          />
        </div>
      </Field>
      <Field label="Animation">
        <div className="flex flex-wrap gap-1.5">
          {ANIMATIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onChange({ animation: a.value })}
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
        <ToggleRow label="Keep under headline" checked={under} onChange={(v) => onChange({ keep_under_headline: v })} />
      )}
      {(isHead || !under) && (
        <Field label="Position">
          <PositionGrid value={t.position ?? (isHead ? "center" : "bottom-center")} color={color} onChange={(a) => onChange({ position: a })} />
        </Field>
      )}
      <ToggleRow label="Same on all frames" checked={Boolean(t.same_on_all)} onChange={(v) => onChange({ same_on_all: v })} />
    </>
  );
}

/* ---------------- Logo */

function LogoPanel({
  logo,
  format,
  frame,
  hasLogo,
  kit,
  actions,
}: {
  logo: LogoSettings;
  format: Format;
  frame: Frame;
  hasLogo: boolean;
  kit: BrandKit | null | undefined;
  actions: InspectorActions;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={fileRef}
      type="file"
      accept="image/png,image/svg+xml,image/webp"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) actions.onAddLogo(f);
      }}
    />
  );
  if (!hasLogo) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-control-fill">
          <Shapes className="size-5 text-el-logo" strokeWidth={1.7} />
        </span>
        <div className="mt-3 text-[14px] font-semibold">Add your logo</div>
        <p className="mt-1 max-w-[230px] text-[13px] text-secondary-text">
          It's saved to your Brand Kit and shows on every ad. A PNG or SVG with a see-through background works best.
        </p>
        <Button variant="primary" size="sm" className="mt-4" onClick={() => fileRef.current?.click()}>
          Add Logo
        </Button>
        {input}
      </div>
    );
  }
  const size = logo.size_pct ?? 16;
  const version = logo.version ?? "auto";
  const show = logo.show_on ?? "all";
  const tiles: { value: NonNullable<LogoSettings["version"]>; label: string; hint: string; path: string | null | undefined }[] = [
    { value: "auto", label: "Auto", hint: "Best contrast", path: logo.dark_path ?? logo.path },
    { value: "light", label: "Light logo", hint: "For dark photos", path: logo.light_path },
    { value: "dark", label: "Dark logo", hint: "For light photos", path: logo.dark_path },
  ];
  return (
    <>
      <Field label="Version">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => {
            const disabled = t.value !== "auto" && !t.path;
            return (
              <button
                key={t.value}
                type="button"
                disabled={disabled}
                onClick={() => actions.onLogo({ version: t.value })}
                title={disabled ? "Add this version in your Brand Kit" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-sm p-2 text-center disabled:opacity-40",
                  version === t.value ? "ring-2 ring-el-logo" : "ring-1 ring-border",
                )}
              >
                <span className={cn("flex h-9 w-full items-center justify-center rounded-sm", t.value === "light" ? "bg-foreground" : "bg-control-fill")}>
                  {t.path && <MediaImage path={t.path} className="max-h-6 max-w-[80%] object-contain" alt="" />}
                </span>
                <span className="text-[12px] font-medium leading-tight">{t.label}</span>
                <span className="text-[10px] leading-tight text-secondary-text">{t.hint}</span>
              </button>
            );
          })}
        </div>
        {kit && !kit.logos.some((l) => l.role === "reversed") && (
          <p className="text-[11px] text-secondary-text">Add a reversed logo in your Brand Kit so Auto can switch on dark photos.</p>
        )}
      </Field>
      <Field label={`Position on ${format}`}>
        <PositionGrid
          value={logo.positions?.[format] ?? "top-right"}
          color="var(--el-logo)"
          onChange={(a) => actions.onLogo({ positions: { ...logo.positions, [format]: a } })}
        />
      </Field>
      <Field label="Size" value={`${size}% of width`}>
        <ElementSlider
          name="Logo size"
          color="var(--el-logo)"
          min={5}
          max={40}
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
            { value: "soft", label: "Soft" },
          ]}
          onChange={(v) => actions.onLogo({ opacity: v })}
        />
      </Field>
      <Field label="Show logo on">
        <div className="flex gap-1.5">
          {(
            [
              { value: "all", label: "All frames" },
              { value: "first_last", label: "First & last" },
              { value: "selected", label: "This frame" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={show === o.value}
              onClick={() => {
                actions.onLogo({ show_on: o.value });
                if (o.value === "selected") actions.onLogoVisible(true);
              }}
              className={cn("h-7 rounded-lg px-2.5 text-[12px] font-medium", show === o.value ? "bg-el-logo text-primary-foreground" : "bg-control-fill")}
            >
              {o.label}
            </button>
          ))}
        </div>
        {show === "selected" && (
          <ToggleRow label="Show on this frame" checked={frame.logo_visible} onChange={actions.onLogoVisible} />
        )}
      </Field>
      {input}
    </>
  );
}

/* ---------------- Timing */

function TimingPanel({ frames, frame, actions, endSeconds }: { frames: Frame[]; frame: Frame; actions: InspectorActions; endSeconds: number }) {
  const d = frame.duration_sec;
  const same = frames.every((f) => f.duration_sec === frames[0]?.duration_sec);
  const pace = (Object.keys(PACE_SECONDS) as Pace[]).find((p) => frames.every((f) => f.duration_sec === PACE_SECONDS[p]));
  const set = (v: number) => actions.onDuration(Math.max(0.5, Math.min(15, Math.round(v * 2) / 2)));
  return (
    <>
      <Field label="Show this frame for">
        <div className="flex items-center justify-between">
          <Button variant="default" size="icon" aria-label="Shorter" onClick={() => set(d - 0.5)} disabled={d <= 0.5}>
            <Minus strokeWidth={1.7} />
          </Button>
          <div className="text-center">
            <span className="text-[34px] font-semibold tracking-[-0.02em] nums">{formatSeconds(d)}</span>
            <span className="ml-1 text-[13px] text-secondary-text">seconds</span>
          </div>
          <Button variant="default" size="icon" aria-label="Longer" onClick={() => set(d + 0.5)} disabled={d >= 15}>
            <Plus strokeWidth={1.7} />
          </Button>
        </div>
        <ElementSlider name="Frame length" color="var(--el-timing)" min={0.5} max={10} step={0.5} value={d} onChange={(v, k) => actions.onDuration(v, k)} />
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

function TransitionPanel({ frames, frame, first, actions }: { frames: Frame[]; frame: Frame; first: boolean; actions: InspectorActions }) {
  if (first) {
    return (
      <p className="py-2 text-center text-[13px] text-secondary-text">The first frame starts the video.</p>
    );
  }
  const tr = frame.transition_in ?? { type: "cut", speed: "smooth" };
  const rest = frames.slice(1);
  const allSame = rest.every((f) => f.transition_in?.type === tr.type && f.transition_in?.speed === tr.speed);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TRANSITION_LABEL) as TransitionSettings["type"][]).map((type) => (
          <button
            key={type}
            type="button"
            data-type={type}
            aria-pressed={tr.type === type}
            onClick={() => actions.onTransition({ type })}
            className={cn("tr-tile flex flex-col items-center gap-1.5 rounded-sm p-1.5", tr.type === type ? "ring-2 ring-el-timing" : "ring-1 ring-border")}
            style={{ "--tr-anim": TR_ANIM[type] } as React.CSSProperties}
          >
            <span className="relative block h-12 w-full overflow-hidden rounded-[3px] bg-secondary-text/40">
              <span className="tr-b absolute inset-0 bg-el-photo/80" />
              {type === "dip_black" && <span className="tr-k absolute inset-0 bg-foreground" />}
            </span>
            <span className="text-[12px] font-medium">{TRANSITION_LABEL[type]}</span>
          </button>
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
      <ToggleRow label="Use for all frames" checked={allSame} onChange={(v) => v && actions.onTransitionAll()} />
    </>
  );
}
