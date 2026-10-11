import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-ui";
import { AdPills, useMainSizeChange } from "@/components/app-ui/AdPills";
import { StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import { useBrandKits, useCreateAdFromFormat, useTemplateName, type EditorDoc, type Template } from "@/lib/stillframe/data";
import { sizeLabel } from "@/lib/stillframe/main-size";
import type { Format } from "@/lib/stillframe/types";
import { BlankFramePanel, FormatChooser } from "./FormatChooser";
import { useAutosave, useEditorDoc } from "./use-editor";

const TITLE = "What are you making?";
const LEAD = "Pick your main size. You'll design in it, and you can change it any time.";
const hint = (f: Format) => `Templates are filtered to ${sizeLabel(f)}.`;

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
    <StepShell adId="" step="format" title={{ name: "New ad" }}
      left={<BlankFramePanel format={format} templateName={template?.name ?? "Start blank"} title="New ad" />}>
      <StepTitle title={TITLE} lead={LEAD} />
      <FormatChooser format={format} onFormat={changeFormat} kitId={kitId ?? null} onKit={setKitId} template={template} onTemplate={setTemplate} />
      <StepActions note={hint(format)}>
        <AppButton size="lg" disabled={create.isPending} onClick={() => void next()}>
          {create.isPending ? "Starting…" : <>Next: Photos <ChevronRight className="size-4" strokeWidth={1.7} /></>}
        </AppButton>
      </StepActions>
    </StepShell>
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
    <StepShell
      adId={doc.project.id}
      step="format"
      pills={<AdPills doc={doc} set={set} readOnly={readOnly} />}
      title={{ name: doc.project.name, onRename: (name) => apply((d) => ({ ...d, project: { ...d.project, name } })), status: readOnly ? undefined : status, readOnly }}
      left={<BlankFramePanel format={main} templateName={templateName.data ?? "Start blank"} title={doc.project.name} />}
    >
      <StepTitle title={TITLE} lead={LEAD} />
      <FormatChooser format={main} onFormat={change} kitId={doc.project.brand_kit_id ?? null} onKit={kit} readOnly={readOnly} />
      <StepActions note={hint(main)}>
        <AppButton asChild size="lg">
          <Link to="/app/ad/$id/photos" params={{ id: doc.project.id }}>Next: Photos <ChevronRight className="size-4" strokeWidth={1.7} /></Link>
        </AppButton>
      </StepActions>
    </StepShell>
  );
}
