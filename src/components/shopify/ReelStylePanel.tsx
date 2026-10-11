import { useState } from "react";
import { AnimationField, ColorField, ElementSlider, Field, PositionGrid, Segmented, SizeField } from "@/components/editor/Inspector";
import { FontPickerCore } from "@/components/stillframe/FontPicker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { frameForFormat, projectForFormat } from "@/lib/stillframe/format-settings";
import { FALLBACK_FONTS, weightsOf, WEIGHT_NAMES, type WebFont } from "@/lib/stillframe/fonts";
import { useQuery } from "@tanstack/react-query";
import { shopifyFetch } from "@/lib/shopify/bridge";
import { DEFAULT_FONT } from "@/render/renderFrame";
import type { ProjectWithFrames, TextSettings } from "@/lib/stillframe/types";
import type { StyleChange } from "@/lib/shopify/reel-build";

export function ReelStylePanel({ project, index, onChange, onReset, onVisible }: {
  project: ProjectWithFrames; index: number;
  onChange: (change: StyleChange) => void; onReset: () => void; onVisible: (visible: boolean) => void;
}) {
  const [part, setPart] = useState<"logo" | "headline" | "subline">("logo");
  const [scope, setScope] = useState<"all" | "slide">("all");
  const { data } = useQuery({ queryKey: ["shopify-fonts", project.id], queryFn: () => shopifyFetch<{ fonts: WebFont[] }>("/api/public/shopify/reel", { action: "fonts", id: project.id }), staleTime: 86400000 });
  const fonts = data?.fonts.length ? data.fonts : FALLBACK_FONTS;
  const base = project.frames[index] ?? project.frames[0];
  if (!base) return null;
  const frame = frameForFormat(base, project.primary_format);
  const logo = projectForFormat(project, project.primary_format).logo;
  const text = (part === "subline" ? frame.subline : frame.headline) ?? {};
  const family = text.font_family ?? frame.headline?.font_family ?? DEFAULT_FONT;
  const weight = text.font_weight ?? (part === "headline" ? 700 : 500);
  const weights = weightsOf(fonts.find((f) => f.family === family));
  const patchText = (patch: Partial<TextSettings>) => {
    if (part !== "logo") onChange({ element: part, scope, index, patch });
  };
  const patchLogo = (patch: Extract<StyleChange, { element: "logo" }>["patch"]) => onChange({ element: "logo", patch });
  return (
    <section aria-label="Style" className="space-y-4 border-t border-border pt-4">
      <Segmented value={part} options={[{ value: "logo", label: "Logo" }, { value: "headline", label: "Headline" }, { value: "subline", label: "Subline" }]} onChange={setPart} />
      {part === "logo" ? <>
        <label className="flex items-center justify-between text-sm">Show logo<Switch checked={logo.enabled !== false} onCheckedChange={(enabled) => patchLogo({ enabled })} /></label>
        <Field label="Position"><PositionGrid value={logo.positions?.[project.primary_format] ?? "top-right"} color="var(--accent-blue)" onChange={(position) => patchLogo({ positions: { ...logo.positions, [project.primary_format]: position } })} /></Field>
        <Field label="Size" value={`${logo.size_pct ?? 16}%`}><ElementSlider name="Logo size" color="var(--accent-blue)" min={5} max={100} value={logo.size_pct ?? 16} onChange={(size_pct) => patchLogo({ size_pct })} /></Field>
        <Field label="Show on"><Segmented value={logo.show_on ?? "all"} options={[{ value: "all", label: "All slides" }, { value: "first_last", label: "First & last" }, { value: "selected", label: "Choose slides" }]} onChange={(show_on) => patchLogo({ show_on })} /></Field>
        {logo.show_on === "selected" && <label className="flex items-center justify-between text-sm">Show on slide {index + 1}<Switch checked={frame.logo_visible} onCheckedChange={onVisible} /></label>}
      </> : <>
        <Segmented value={scope} options={[{ value: "all", label: "Apply to all slides" }, { value: "slide", label: "This slide only" }]} onChange={setScope} />
        <Field label="Font"><FontPickerCore fonts={fonts} title={`${part === "headline" ? "Headline" : "Subline"} font`} family={family} weight={weight} sampleText={text.text ?? ""} remember={false} side="bottom" onChange={(font_family, font_weight) => patchText({ font_family, font_weight })}><Button variant="outline" className="w-full justify-between" aria-label={`${part === "headline" ? "Headline" : "Subline"} font: ${family}`}>{family}</Button></FontPickerCore></Field>
        <Field label="Weight"><select aria-label={`${part === "headline" ? "Headline" : "Subline"} weight`} value={weight} onChange={(e) => patchText({ font_weight: Number(e.target.value) })} className="h-9 w-full rounded border border-input bg-background px-2 text-sm">{[...new Set([...weights, weight])].sort((a, b) => a - b).map((w) => <option key={w} value={w}>{WEIGHT_NAMES[w] ?? w}</option>)}</select></Field>
        <SizeField el={part} t={text} onChange={patchText} />
        <ColorField el={part} t={text} brandColors={[]} remember={false} onChange={patchText} />
        {part === "headline" ? <>
          <Field label="Position"><PositionGrid value={text.position ?? "center"} color="var(--accent-blue)" onChange={(position) => patchText({ position })} /></Field>
          <AnimationField value={text.animation ?? "none"} onPick={(animation) => patchText({ animation })} />
        </> : <label className="flex items-center justify-between text-sm">Keep under headline<Switch checked={text.keep_under_headline !== false} onCheckedChange={(keep_under_headline) => patchText({ keep_under_headline })} /></label>}
      </>}
      <Button variant="outline" data-cta="shopify-reset-template" onClick={onReset}>Reset to template</Button>
    </section>
  );
}