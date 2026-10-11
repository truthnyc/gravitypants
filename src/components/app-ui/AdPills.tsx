import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectKeys, saveEditorDoc, useBrandKit, useBrandKits, type EditorDoc } from "@/lib/stillframe/data";
import { MAIN_SIZES, refitForMainSize, sizeLabel } from "@/lib/stillframe/main-size";
import type { Format } from "@/lib/stillframe/types";

const pill = "inline-flex h-9 min-h-0 items-center gap-2 rounded-full border border-ap-hairline bg-ap-card px-3 text-[13px] font-medium text-ap-ink hover:border-ap-muted disabled:opacity-50";

/** Main-size change with re-fit, toast and 6-second Undo. `set` replaces the whole doc. */
export function useMainSizeChange(doc: EditorDoc, set: (next: EditorDoc) => void) {
  const { data: settings } = useBrandKit();
  return (format: Format) => {
    if (format === doc.project.primary_format) return;
    const prev = doc;
    set(refitForMainSize(doc, format, settings?.default_logo_positions));
    toast(`Layout re-fitted to ${sizeLabel(format)}. Text and photos kept.`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => set(prev) },
    });
  };
}

/** For steps that show a saved ad without an editable doc (Export, Share). */
export function useSaveDoc(doc: EditorDoc) {
  const qc = useQueryClient();
  return (next: EditorDoc) => {
    void saveEditorDoc(doc, next)
      .then(() => qc.invalidateQueries({ queryKey: projectKeys.detail(doc.project.id) }))
      .catch(() => toast.error("Couldn't save the size. Try again."));
  };
}

export function SizePill({ value, onChange, disabled }: { value: Format; onChange: (f: Format) => void; disabled?: boolean }) {
  const r = MAIN_SIZES.find((s) => s.format === value)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={pill} aria-label={`Main size: ${sizeLabel(value)}`}>
          <span aria-hidden className="block w-3 rounded-[2px] bg-ap-blue" style={{ height: Math.round((12 * r.height) / r.width) > 18 ? 18 : Math.max(7, Math.round((12 * r.height) / r.width)) }} />
          {sizeLabel(value)}
          <ChevronDown className="size-3.5" strokeWidth={1.7} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>Main size</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as Format)}>
          {MAIN_SIZES.map((s) => (
            <DropdownMenuRadioItem key={s.format} value={s.format} className="justify-between">
              <span>{s.name} {s.format}</span>
              <span className="ml-auto text-[12px] text-ap-muted nums">{s.width}×{s.height}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BrandPill({ value, onChange, disabled }: { value: string | null; onChange: (id: string | null) => void; disabled?: boolean }) {
  const { data: kits } = useBrandKits();
  const current = kits?.find((k) => k.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={pill} aria-label="Brand kit for the whole video">
          <span className="size-3 rounded-[3px] bg-ap-blue" style={current?.colors?.[0] ? { background: current.colors[0] } : undefined} aria-hidden />
          Brand
          <ChevronDown className="size-3.5" strokeWidth={1.7} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>Brand kit for the whole video</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
          <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
          {kits?.map((k) => <DropdownMenuRadioItem key={k.id} value={k.id}>{k.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/app/brand">Manage in Brand Kit ›</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Header right side for every ad step. Without onKit the brand choice is applied by linking the kit only. */
export function AdPills({ doc, set, onKit, readOnly }: { doc: EditorDoc; set: (next: EditorDoc) => void; onKit?: (id: string | null) => void; readOnly?: boolean }) {
  const change = useMainSizeChange(doc, set);
  const kit = onKit ?? ((id: string | null) => set({ ...doc, project: { ...doc.project, brand_kit_id: id, logo: { ...doc.project.logo, kit_stamp: null } } }));
  return (
    <div className="flex items-center gap-2">
      <BrandPill value={doc.project.brand_kit_id ?? null} onChange={kit} disabled={readOnly} />
      <SizePill value={doc.project.primary_format} onChange={change} disabled={readOnly} />
    </div>
  );
}
