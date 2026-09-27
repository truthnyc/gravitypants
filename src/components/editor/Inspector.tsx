import { Clock, Image as ImageIcon, Shapes, Sparkles, Type, TextQuote } from "lucide-react";
import type { EditorDoc } from "@/lib/stillframe/data";
import {
  TEXT_COLORS,
  TEXT_FONTS,
  weightsForFont,
  formatSeconds,
  type Format,
  type Frame,
  type TextSettings,
} from "@/lib/stillframe/types";
import { ANCHORS, DEFAULT_FONT } from "@/render/renderFrame";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELEMENT_META, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";

const ICONS: Record<ElementKey, typeof Type> = {
  photo: ImageIcon,
  headline: Type,
  subline: TextQuote,
  logo: Shapes,
  timing: Clock,
  transition: Sparkles,
};

const TRANSITION_LABEL: Record<string, string> = {
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

function fileName(path?: string | null) {
  if (!path) return "No photo";
  const base = path.split("/").pop() ?? path;
  return base.replace(/^[0-9a-f-]{36}-/, "");
}

export function Inspector({
  doc,
  frame,
  frameIndex,
  format,
  selected,
  onSelect,
  onHeadline,
}: {
  doc: EditorDoc;
  frame: Frame;
  frameIndex: number;
  format: Format;
  selected: ElementKey;
  onSelect: (el: ElementKey) => void;
  onHeadline: (patch: Partial<TextSettings>, key?: string) => void;
}) {
  const values: Record<ElementKey, string> = {
    photo: fileName(frame.photo?.path),
    headline: firstWords(frame.headline),
    subline: firstWords(frame.subline),
    logo: doc.project.logo.path || doc.project.logo.light_path
      ? pretty(doc.project.logo.positions?.[format] ?? "top-right")
      : "No logo yet",
    timing: `${formatSeconds(frame.duration_sec)} seconds`,
    transition: frameIndex === 0 ? "Start" : (TRANSITION_LABEL[frame.transition_in?.type ?? "cut"] ?? "Cut"),
  };
  const meta = ELEMENT_META[selected];

  return (
    <aside className="flex w-[344px] shrink-0 flex-col overflow-y-auto bg-inspector p-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(ELEMENT_META) as ElementKey[]).map((el) => {
          const m = ELEMENT_META[el];
          const Icon = ICONS[el];
          const active = selected === el;
          return (
            <button
              key={el}
              type="button"
              onClick={() => onSelect(el)}
              className="flex flex-col items-start gap-1.5 rounded-sm bg-card p-2.5 text-left shadow-card transition-shadow"
              style={active ? { boxShadow: `0 0 0 2px ${m.color}`, background: `color-mix(in srgb, ${m.color} 7%, var(--card))` } : undefined}
            >
              <span className="flex size-[22px] items-center justify-center rounded-full" style={{ background: m.color }}>
                <Icon className="size-3 text-primary-foreground" strokeWidth={1.7} />
              </span>
              <span className="text-[13px] font-semibold leading-none">{m.label}</span>
              <span className="w-full truncate text-[12px] leading-tight text-secondary-text nums">{values[el]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[15px] font-semibold">{meta.label}</span>
        <span className="ml-auto text-[12px] text-secondary-text nums">
          {selected === "logo" ? "Whole video" : `Frame ${frameIndex + 1}`}
        </span>
      </div>

      <div className="mt-3">
        {selected === "headline" ? (
          <HeadlinePanel headline={frame.headline} onChange={onHeadline} />
        ) : (
          <p className="rounded-sm bg-card p-4 text-[13px] text-secondary-text shadow-card">
            {meta.label} settings arrive in the next step. You can already drag it on the preview.
          </p>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-medium text-secondary-text">{label}</div>
      {children}
    </div>
  );
}

const ANIMATIONS: { value: NonNullable<TextSettings["animation"]>; label: string }[] = [
  { value: "none", label: "None" },
  { value: "rise", label: "Rise" },
  { value: "fade", label: "Fade" },
  { value: "pop", label: "Pop" },
  { value: "typewriter", label: "Type" },
];

function HeadlinePanel({
  headline,
  onChange,
}: {
  headline: TextSettings | null;
  onChange: (patch: Partial<TextSettings>, key?: string) => void;
}) {
  const h = headline ?? {};
  const size = h.size_px ?? 108;
  const family = h.font_family ?? DEFAULT_FONT;
  const weights = weightsForFont(family);
  const weight = h.font_weight ?? 700;
  return (
    <div className="space-y-4 rounded-sm bg-card p-4 shadow-card">
      <Field label="Text">
        <Input
          value={h.text ?? ""}
          placeholder="Add a headline"
          onChange={(e) => onChange({ text: e.target.value }, "headline-text")}
          className="h-9 rounded-sm"
        />
      </Field>
      <Field label="Font">
        <Select
          value={family}
          onValueChange={(v) => {
            const ws = weightsForFont(v);
            // Keep the current weight if the new font has it, otherwise pick the closest available.
            const next = ws.some((w) => w.value === weight)
              ? weight
              : ws.reduce((best, w) => (Math.abs(w.value - weight) < Math.abs(best.value - weight) ? w : best), ws[0]!).value;
            onChange({ font_family: v, font_weight: next });
          }}
        >
          <SelectTrigger className="h-9 rounded-sm" style={{ fontFamily: `"${family}"` }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_FONTS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: `"${f}"` }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Size">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-secondary-text">A</span>
          <Slider min={24} max={240} step={1} value={[size]} onValueChange={([v]) => onChange({ size_px: v ?? size }, "headline-size")} aria-label="Headline size" />
          <span className="text-[17px] text-secondary-text">A</span>
          <span className="w-14 text-right text-[12px] nums">{size} px</span>
        </div>
      </Field>
      <Field label="Color">
        <div className="flex gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => onChange({ color: c })}
              className={cn("size-7 rounded-full border border-border", (h.color ?? "#FFFFFF").toUpperCase() === c && "ring-2 ring-primary ring-offset-2")}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="Animation">
        <div className="flex rounded-lg bg-control-fill p-0.5">
          {ANIMATIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onChange({ animation: a.value })}
              className={cn("h-7 flex-1 rounded-lg text-[12px] font-medium", (h.animation ?? "none") === a.value && "bg-card shadow-segment")}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Position">
        <div className="grid w-[96px] grid-cols-3 gap-1 rounded-sm bg-control-fill p-1">
          {ANCHORS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={pretty(a)}
              onClick={() => onChange({ position: a })}
              className="flex size-7 items-center justify-center rounded-sm hover:bg-card"
            >
              <span className={cn("size-2 rounded-full bg-secondary-text/40", (h.position ?? "center") === a && "size-2.5 bg-el-headline")} />
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-center justify-between text-[13px]">
        Same on all frames
        <Switch checked={Boolean(h.same_on_all)} onCheckedChange={(v) => onChange({ same_on_all: v })} className="data-[state=checked]:bg-toggle-on" />
      </label>
    </div>
  );
}
