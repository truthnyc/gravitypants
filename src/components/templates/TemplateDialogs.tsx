import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { useIsPlatformAdmin, useSaveTemplate, useTemplateAccess, useTemplates, type Template } from "@/lib/stillframe/data";
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
  const { data: isStaff = false } = useIsPlatformAdmin();
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
            {(access?.team || isStaff) && (
              <div className="space-y-1.5">
                <span className="text-[12px] text-secondary-text">Who can use it?</span>
                <div className="flex rounded-lg bg-control-fill p-0.5">
                  {(
                    [
                      ["private", "Only me"] as const,
                      ...(access?.team ? [["team", `Everyone in ${access.name}`] as const] : []),
                      ...(isStaff ? [["global", "Everyone on Gravity Pants"] as const] : []),
                    ]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      aria-pressed={visibility === v}
                      className={cn("h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-[13px] font-medium lg:h-8", visibility === v && "bg-card shadow-segment")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="plain" onClick={() => onOpenChange(false)}>Cancel</Button>
          {access?.paid && (
            <Button
              disabled={!name.trim() || save.isPending || (visibility === "team" && !access.team) || (visibility === "global" && !isStaff)}
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

/** Choose a fresh ad or an existing look after choosing photos. */
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
  const ready = templates.filter((t) => t.visibility === "global");
  const own = templates.filter((t) => t.visibility !== "global");
  const mine = access?.paid ? own.filter((t) => t.created_by === access.userId) : [];
  const shared = access?.team
    ? own.filter((t) => t.visibility === "team" && t.created_by !== access.userId)
    : [];
  const any = mine.length > 0 || shared.length > 0 || ready.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] overflow-y-auto rounded-sm sm:max-w-[560px]">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-[19px]">Create your ad</DialogTitle>
          <p className="text-[14px] text-secondary-text nums">{count} {count === 1 ? "photo is" : "photos are"} ready.{any ? " Start fresh or use a ready-made look." : " Start a new ad with your photos."}</p>
        </DialogHeader>
        <Button onClick={() => onPick(null)} className="h-12 w-full text-[15px]">Start with my photos</Button>

        {any && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-[13px] font-medium text-secondary-text">Or use a saved look</p>
            {([ ["Your templates", mine], ["Shared with your team", shared], ["Ready-made templates", ready] ] as const).map(([heading, list]) => list.length > 0 && (
              <section key={heading}>
                <h3 className="mb-2 text-[13px] font-semibold">{heading}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {list.map((t) => (
                    <Button key={t.id} type="button" variant="outline" onClick={() => onPick(t)} className="h-auto min-w-0 flex-col items-stretch gap-0 whitespace-normal rounded-sm p-2 text-left">
                      <TemplateThumb template={t} className="aspect-square w-full" />
                      <span className="mt-2 block w-full truncate text-[13px] font-semibold">{t.name}</span>
                      <span className="block w-full text-[11px] font-normal text-secondary-text nums">{t.settings.frame_count} frames</span>
                    </Button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
