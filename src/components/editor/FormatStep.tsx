import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-ui";
import { useMainSizeChange } from "@/components/app-ui/AdPills";
import { AdMenu, EmptyStrip, StageBar, StageChip, StudioBottom, StudioCanvas, StudioPanel, StudioShell } from "@/components/app-ui/StudioLayout";
import { useBrandKits, useCreateAdFromFormat, useTemplateName, type EditorDoc, type Template } from "@/lib/stillframe/data";
import { MAIN_SIZES, sizeLabel } from "@/lib/stillframe/main-size";
import type { Format } from "@/lib/stillframe/types";
import { FormatChooser } from "./FormatChooser";
import { useAutosave, useEditorDoc } from "./use-editor";

const TITLE = "What are you making?";
const LEAD = "Pick your main size. You'll design in it, and you can change it any time.";
const hint = (f: Format) => `Templates are filtered to ${sizeLabel(f)}.`;

function FormatStage({ format, templateName }: { format: Format; templateName: string }) {
  const s = MAIN_SIZES.find((x) => x.format === format)!;
  return (
    <>
      <StageBar label="Main size"><StageChip on>{sizeLabel(format)}</StageChip></StageBar>
      <StudioCanvas ratio={s.width / s.height} label={`${format} · ${s.width} × ${s.height}`}>
        <div className="grid h-full w-full place-items-center rounded-[6px] border-2 border-dashed border-ap-switch-off bg-ap-card text-[13px] text-ap-muted">{templateName}</div>
      </StudioCanvas>
    </>
  );
}

const formatBottom = (
  <StudioBottom disabled right={<span>No frames yet</span>}><EmptyStrip /></StudioBottom>
);

/** Format step for a new ad (no ad exists yet): Next creates it and opens Photos. */
export function NewAdFormatStep() {
  const navigate = useNavigate();
  const create = useCreateAdFromFormat();
  const { data: kits } = useBrandKits();
  const [format, setFormat] = useState<Format>("4:5");
  const [template, setTemplate] = useState<Template | null>(null);
  const [kitId, setKitId] = useState<string | null | undefined>(undefined);
  useEffect(() => { if (kitId === undefined && kits) setKitId(kits.find((k) => k.is_default)?.id ?? null); }, [kits, kitId]);
  const changeFormat = (f: Format) => { setFormat(f); if (template && f !== format) setTemplate(null); };
  const next = async () => {
    try {
      const id = await create.mutateAsync({ format, template, kitId: kitId ?? null });
      navigate({ to: "/app/ad/$id/photos", params: { id } });
    } catch {
      toast.error("Couldn't start your ad. Try again.");
    }
  };
  return (
    <StudioShell
      adId="" step="format" title={{ name: "New ad" }}
      next={<AppButton disabled={create.isPending} onClick={() => void next()}>{create.isPending ? "Starting…" : <>Next: Photos <ChevronRight className="size-4" strokeWidth={1.7} /></>}</AppButton>}
      panel={
        <StudioPanel step="format" title={TITLE} footer={hint(format)}>
          <p className="mb-4 text-[14px] leading-normal text-ap-body">{LEAD}</p>
          <FormatChooser format={format} onFormat={changeFormat} kitId={kitId ?? null} onKit={setKitId} template={template} onTemplate={setTemplate} />
        </StudioPanel>
      }
      stage={<FormatStage format={format} templateName={template?.name ?? "Start blank"} />}
      bottom={formatBottom}
    />
  );
}

/** Format step for an existing ad: changing the size re-fits the layout. */
export function FormatStep({ initial, readOnly = false }: { initial: EditorDoc; readOnly?: boolean }) {
  const { doc, apply } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);
  const set = (next: EditorDoc) => apply(() => next);
  const change = useMainSizeChange(doc, set);
  const templateName = useTemplateName(doc.project.template_id);
  const main = doc.project.primary_format;
  const kit = (id: string | null) => set({ ...doc, project: { ...doc.project, brand_kit_id: id, logo: { ...doc.project.logo, kit_stamp: null } } });
  return (
    <StudioShell
      adId={doc.project.id}
      step="format"
      title={{ name: doc.project.name, onRename: (name) => apply((d) => ({ ...d, project: { ...d.project, name } })), status: readOnly ? undefined : status, readOnly }}
      menu={<AdMenu doc={doc} set={set} readOnly={readOnly} />}
      next={<AppButton asChild><Link to="/app/ad/$id/photos" params={{ id: doc.project.id }}>Next: Photos <ChevronRight className="size-4" strokeWidth={1.7} /></Link></AppButton>}
      panel={
        <StudioPanel step="format" title={TITLE} footer={hint(main)}>
          <p className="mb-4 text-[14px] leading-normal text-ap-body">{LEAD}</p>
          <FormatChooser format={main} onFormat={change} kitId={doc.project.brand_kit_id ?? null} onKit={kit} readOnly={readOnly} />
        </StudioPanel>
      }
      stage={<FormatStage format={main} templateName={templateName ?? "Start blank"} />}
      bottom={formatBottom}
    />
  );
}
