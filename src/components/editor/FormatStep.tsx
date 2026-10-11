import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import { AppButton } from "@/components/app-ui";
import { AdPills, useMainSizeChange } from "@/components/app-ui/AdPills";
import { ReelCard, StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import type { EditorDoc } from "@/lib/stillframe/data";
import { MAIN_SIZES } from "@/lib/stillframe/main-size";
import { cn } from "@/lib/utils";
import { useReelPlayer } from "./ReelPreview";
import { useAutosave, useEditorDoc } from "./use-editor";

/** Step 1: choose the ad's main size. Other sizes are added at Export. */
export function FormatStep({ initial, readOnly = false }: { initial: EditorDoc; readOnly?: boolean }) {
  const { doc, apply } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);
  const player = useReelPlayer(doc);
  const set = (next: EditorDoc) => apply(() => next);
  const change = useMainSizeChange(doc, set);
  const main = doc.project.primary_format;
  const n = doc.frames.length;
  return (
    <StepShell
      adId={doc.project.id}
      step="format"
      pills={<AdPills doc={doc} set={set} readOnly={readOnly} />}
      title={{ name: doc.project.name, onRename: (name) => apply((d) => ({ ...d, project: { ...d.project, name } })), status: readOnly ? undefined : status, readOnly }}
      left={
        <ReelCard
          preview={player.preview} playing={player.playing} onTogglePlay={player.toggle} segments={player.segments}
          time={player.time} total={player.total} name={doc.project.name} readOnly={readOnly}
          meta={`${n} ${n === 1 ? "photo" : "photos"} · ${player.total.toFixed(1)} sec`}
          status={readOnly ? undefined : status} formats={doc.project.formats} format={main} onFormat={() => {}} sizesSlot={null}
        />
      }
    >
      <StepTitle title="Choose the main size" lead="You design in this size. Add other sizes when you export." />
      <div role="radiogroup" aria-label="Main size" className="flex flex-col gap-2">
        {MAIN_SIZES.map((s) => {
          const on = s.format === main;
          const tw = s.width >= s.height ? 28 : Math.round((28 * s.width) / s.height);
          const th = s.height >= s.width ? 28 : Math.round((28 * s.height) / s.width);
          return (
            <button
              key={s.format} type="button" role="radio" aria-checked={on} disabled={readOnly}
              onClick={() => change(s.format)}
              className={cn("flex min-h-[56px] items-center gap-3.5 rounded-[14px] border bg-ap-card px-3.5 py-2.5 text-left", on ? "border-ap-blue bg-ap-soft-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline hover:border-ap-muted")}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-ap-panel"><span className="block rounded-[2px] bg-ap-blue" style={{ width: tw, height: th }} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.name} <span className="font-normal text-ap-muted nums">{s.format}</span></span>
                <span className="block text-[12.5px] text-ap-subhead nums">{s.width} × {s.height}</span>
              </span>
              <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-ap-blue bg-ap-blue text-ap-card" : "border-ap-hairline")}>
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
              </span>
            </button>
          );
        })}
      </div>
      <StepActions note="You can change the main size later from the size menu at the top.">
        <AppButton asChild size="lg">
          <Link to="/app/ad/$id/photos" params={{ id: doc.project.id }}>Next: Photos <ChevronRight className="size-4" strokeWidth={1.7} /></Link>
        </AppButton>
      </StepActions>
    </StepShell>
  );
}
