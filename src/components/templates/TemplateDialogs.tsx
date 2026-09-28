import { useState } from "react";
import { openUpgrade } from "@/lib/stillframe/plan";
import { Link } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { useSaveTemplate, useTemplateAccess, useTemplates, type Template } from "@/lib/stillframe/data";
import type { ProjectWithFrames } from "@/lib/stillframe/types";
import { cn } from "@/lib/utils";

const fail = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

export function UpgradeNote({ team = false }: { team?: boolean }) {
  return (
    <div className="rounded-sm bg-control-fill p-4 text-[13px]">
      <p className="font-medium">{team ? "Sharing templates with your team is part of the Team plan." : "Templates come with a paid plan."}</p>
      <Link to="/pricing" className="mt-1 inline-flex h-11 items-center font-medium text-link lg:h-auto">See plans</Link>
    </div>
  );
}

export function SaveTemplateDialog({ project, open, onOpenChange }: { project: ProjectWithFrames; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: access } = useTemplateAccess();
  const save = useSaveTemplate();
  const [name, setName] = useState(project.name);
  const [visibility, setVisibility] = useState<Template["visibility"]>("private");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] rounded-sm sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">Save as template</DialogTitle>
        </DialogHeader>
        {access && !access.paid ? (
          <UpgradeNote />
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-[12px] text-secondary-text">Template name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] lg:h-10 lg:text-[14px]"
              />
            </label>
            <p className="text-[12px] text-secondary-text">Keeps frames, timing, transitions, text styles, logo and formats. Photos aren't saved.</p>
            {access?.isTeamWorkspace && (
              <div className="space-y-1.5">
                <span className="text-[12px] text-secondary-text">Who can use it?</span>
                <div className="flex rounded-lg bg-control-fill p-0.5">
                  {(
                    [
                      ["private", "Only me"],
                      ["team", `Everyone in ${access.name}`],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => (v === "team" && !access.team ? openUpgrade("team_sharing") : setVisibility(v))}
                      aria-pressed={visibility === v}
                      className={cn("h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-[13px] font-medium lg:h-8", visibility === v && "bg-card shadow-segment")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {visibility === "team" && !access.team && <UpgradeNote team />}
              </div>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="plain" onClick={() => onOpenChange(false)}>Cancel</Button>
          {access?.paid && (
            <Button
              disabled={!name.trim() || save.isPending || (visibility === "team" && !access.team)}
              onClick={() =>
                save.mutate(
                  { project, name: name.trim(), visibility },
                  {
                    onSuccess: () => {
                      toast.success("Saved as template");
                      onOpenChange(false);
                    },
                    onError: fail,
                  },
                )
              }
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateThumb({ template, className }: { template: Template; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-sm bg-inspector", className)}>
      {template.thumbnail_url ? (
        <MediaImage path={template.thumbnail_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <LayoutTemplate className="size-6 text-icon" strokeWidth={1.7} />
      )}
    </div>
  );
}

/** "Start from" after choosing photos: Blank or a template. */
export function StartFromDialog({
  open,
  count,
  onCancel,
  onPick,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onPick: (t: Template | null) => void;
}) {
  const { data: access } = useTemplateAccess();
  const { data: templates = [] } = useTemplates();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const list = templates.filter((t) => (tab === "mine" ? t.created_by === access?.userId : t.visibility === "team"));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] overflow-y-auto rounded-sm sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">Start from</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-[13px] text-secondary-text nums">{count} {count === 1 ? "photo" : "photos"} ready</p>

        <button
          type="button"
          onClick={() => onPick(null)}
          className="flex min-h-14 items-center gap-3 rounded-sm bg-card p-3 text-left shadow-card"
        >
          <span className="flex size-10 items-center justify-center rounded-sm border border-dashed border-placeholder-border text-[12px] text-secondary-text">+</span>
          <span>
            <span className="block text-[14px] font-semibold">Blank</span>
            <span className="block text-[12px] text-secondary-text">Your photos with the default look</span>
          </span>
        </button>

        <div className="flex rounded-lg bg-control-fill p-0.5">
          {(
            [
              ["mine", "My templates"],
              ["team", "Team templates"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              aria-pressed={tab === v}
              className={cn("h-11 flex-1 rounded-lg text-[13px] font-medium lg:h-8", tab === v && "bg-card shadow-segment")}
            >
              {label}
            </button>
          ))}
        </div>

        {access && !access.paid ? (
          <UpgradeNote />
        ) : tab === "team" && access && !access.team && !list.length ? (
          <UpgradeNote team />
        ) : list.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((t) => (
              <button key={t.id} type="button" onClick={() => onPick(t)} className="rounded-sm bg-card p-2 text-left shadow-card">
                <TemplateThumb template={t} className="aspect-square w-full" />
                <span className="mt-2 block truncate text-[13px] font-semibold">{t.name}</span>
                <span className="block text-[11px] text-secondary-text nums">{t.settings.frame_count} frames</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-[13px] text-secondary-text">
            {tab === "mine" ? "No templates yet. Use \"Save as Template\" on any ad." : "No team templates yet."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
