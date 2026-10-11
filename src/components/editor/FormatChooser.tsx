import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { AppCard, AppSectionLabel } from "@/components/app-ui";
import { TemplatePreview, templateFormat } from "@/components/templates/TemplatePreview";
import { useBrandKits, useTemplates, type Template } from "@/lib/stillframe/data";
import { EXPORT_SIZES } from "@/lib/stillframe/export-sizes";
import { MAIN_SIZES, sizeIdOf, sizeLabel } from "@/lib/stillframe/main-size";
import type { Format } from "@/lib/stillframe/types";
import { cn } from "@/lib/utils";

/** "Posting to" on the Format step: one platform sets the main size. */
export const FORMAT_PLATFORMS: { name: string; format: Format }[] = [
  { name: "Instagram", format: "4:5" },
  { name: "TikTok", format: "9:16" },
  { name: "YouTube", format: "16:9" },
  { name: "Facebook", format: "4:5" },
  { name: "LinkedIn", format: "4:5" },
  { name: "Website", format: "16:9" },
];

const usesOf = (f: Format) => (EXPORT_SIZES.find((s) => s.id === sizeIdOf(f))?.uses ?? []).slice(0, 3).map((u) => u.label).join(", ");
const ratio = (f: Format) => f.replace(":", " / ");

function Thumb({ format, size = 28 }: { format: Format; size?: number }) {
  const s = MAIN_SIZES.find((x) => x.format === format)!;
  const w = s.width >= s.height ? size : Math.round((size * s.width) / s.height);
  const h = s.height >= s.width ? size : Math.round((size * s.height) / s.width);
  return <span className="block rounded-[2px] bg-ap-blue" style={{ width: w, height: h }} />;
}

/** Templates that match a size, for the Format step row. */
export function useTemplatesFor(format: Format) {
  const { data } = useTemplates();
  return (data ?? []).filter((t) => templateFormat(t) === format);
}

export function FormatChooser({ format, onFormat, kitId, onKit, template, onTemplate, readOnly }: {
  format: Format;
  onFormat: (f: Format) => void;
  kitId: string | null;
  onKit: (id: string | null) => void;
  /** Omit onTemplate to hide the template row (an existing ad keeps its template). */
  template?: Template | null;
  onTemplate?: (t: Template | null) => void;
  readOnly?: boolean | undefined;
}) {
  const [platform, setPlatform] = useState<string | null>(null);
  const { data: kits } = useBrandKits();
  const templates = useTemplatesFor(format);
  return (
    <div className={cn(readOnly && "pointer-events-none opacity-60")}>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] text-ap-muted">Posting to</span>
        {FORMAT_PLATFORMS.map((p) => {
          const on = platform === p.name;
          return (
            <button
              key={p.name} type="button" aria-pressed={on}
              onClick={() => { if (on) setPlatform(null); else { setPlatform(p.name); onFormat(p.format); } }}
              className={cn("min-h-9 rounded-full border px-3.5 text-[14px]", on ? "border-ap-blue bg-ap-soft-blue text-ap-blue" : "border-transparent bg-ap-panel text-ap-ink hover:bg-ap-segment-hover")}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Main size" className="flex flex-col gap-2">
        {MAIN_SIZES.map((s) => {
          const on = s.format === format;
          return (
            <button
              key={s.format} type="button" role="radio" aria-checked={on}
              onClick={() => { onFormat(s.format); if (platform && FORMAT_PLATFORMS.find((p) => p.name === platform)?.format !== s.format) setPlatform(null); }}
              className={cn("flex min-h-[60px] items-center gap-3.5 rounded-[14px] border bg-ap-card px-3.5 py-2.5 text-left", on ? "border-ap-blue bg-ap-soft-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline hover:border-ap-muted")}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-ap-panel"><Thumb format={s.format} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {s.name} <span className="font-normal text-ap-muted nums">{s.format}</span>
                  {s.format === "4:5" && !platform && <span className="ml-2 text-[12px] font-medium text-ap-blue">★ Recommended for feeds</span>}
                </span>
                <span className="block truncate text-[13px] text-ap-muted">
                  <span className="mr-2 text-[12.5px] text-ap-subhead nums">{s.width}×{s.height}</span>{usesOf(s.format)}
                </span>
              </span>
              <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-ap-blue bg-ap-blue text-ap-card" : "border-ap-hairline")}>
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
              </span>
            </button>
          );
        })}
      </div>

      {onTemplate && (
        <>
          <AppSectionLabel className="mt-6 mb-2.5">Template</AppSectionLabel>
          <div className="flex gap-3 overflow-x-auto pb-1" role="radiogroup" aria-label="Template">
            {[null, ...templates].map((t) => {
              const on = (template?.id ?? null) === (t?.id ?? null);
              return (
                <button key={t?.id ?? "blank"} type="button" role="radio" aria-checked={on} onClick={() => onTemplate(t)} className="w-[96px] shrink-0 text-center text-[13px]">
                  <span className={cn("grid h-[110px] place-items-center overflow-hidden rounded-[12px] border-2 p-2", on ? "border-ap-blue bg-ap-soft-blue" : "border-transparent bg-ap-panel")}>
                    {t ? (
                      <span className="block max-h-full max-w-full overflow-hidden rounded-[3px]" style={{ aspectRatio: ratio(format), height: format === "16:9" || format === "5:4" ? undefined : "100%", width: format === "16:9" || format === "5:4" ? "100%" : undefined }}>
                        <TemplatePreview template={t} playing={false} className="h-full w-full" />
                      </span>
                    ) : (
                      <span className="grid place-items-center rounded-[3px] border-2 border-dashed border-ap-switch-off" style={{ aspectRatio: ratio(format), height: format === "16:9" || format === "5:4" ? undefined : "100%", width: format === "16:9" || format === "5:4" ? "100%" : undefined }}>
                        <Plus className="size-4 text-ap-muted" strokeWidth={1.7} />
                      </span>
                    )}
                  </span>
                  <span className={cn("mt-1.5 block truncate", on && "font-semibold")}>{t?.name ?? "Start blank"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <AppSectionLabel className="mt-6 mb-2.5">Brand kit</AppSectionLabel>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Brand kit">
        {(kits ?? []).map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kitId === k.id} onClick={() => onKit(k.id)}
            className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-[14px]", kitId === k.id ? "border-ap-blue bg-ap-soft-blue text-ap-blue" : "border-transparent bg-ap-panel")}>
            <span className="size-3 rounded-[3px] bg-ap-blue" style={k.colors?.[0] ? { background: k.colors[0] } : undefined} aria-hidden />
            {k.name}{k.is_default && <span className="text-[12px] text-ap-muted">default</span>}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={kitId === null} onClick={() => onKit(null)}
          className={cn("min-h-9 rounded-full border px-3.5 text-[14px]", kitId === null ? "border-ap-blue bg-ap-soft-blue text-ap-blue" : "border-transparent bg-ap-panel")}>None</button>
        <Link to="/app/brand" className="inline-flex min-h-9 items-center rounded-full px-3.5 text-[14px] text-ap-blue hover:bg-ap-panel">+ New kit</Link>
      </div>
      <p className="mt-2 text-[13px] text-ap-muted">Sets your logo, fonts and colors. Change it any time from the header.</p>
    </div>
  );
}

/** Left panel on the Format step: blank dashed frame at the chosen ratio. */
export function BlankFramePanel({ format, templateName, title }: { format: Format; templateName: string; title: string }) {
  const wide = format === "16:9" || format === "5:4";
  return (
    <AppCard>
      <div className="relative grid h-[340px] place-items-center rounded-[18px] bg-ap-panel p-[22px] sm:h-[380px]">
        <div className="grid place-items-center rounded-[6px] border-2 border-dashed border-ap-switch-off bg-ap-card text-[13px] text-ap-muted" style={{ aspectRatio: ratio(format), height: wide ? undefined : "100%", width: wide ? "100%" : undefined }}>
          {templateName}
        </div>
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-ap-card px-2.5 py-0.5 text-[12px] text-ap-muted shadow-ap-soft nums">
          {MAIN_SIZES.find((s) => s.format === format)!.width} × {MAIN_SIZES.find((s) => s.format === format)!.height}
        </span>
      </div>
      <h3 className="mt-4 text-[18px] font-semibold">{title}</h3>
      <p className="mt-1 text-[14px] text-ap-muted">{sizeLabel(format)}</p>
    </AppCard>
  );
}
