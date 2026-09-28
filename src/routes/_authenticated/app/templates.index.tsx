import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TemplateThumb, UpgradeNote } from "@/components/templates/TemplateDialogs";
import { useCanEditKits, useIsPlatformAdmin, useMyUserId, useDeleteTemplate, useTemplateAccess, useTemplates, useUpdateTemplate, type Template } from "@/lib/stillframe/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Gravity Pants" },
      { name: "description", content: "Reuse the look of your best ads. Rename, share and tidy your ad templates." },
      { property: "og:title", content: "Templates — Gravity Pants" },
      { property: "og:description", content: "Ad templates you can reuse and share with your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplatesPage,
});

const fail = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

function TemplatesPage() {
  const { data: access } = useTemplateAccess();
  const { data: isAdmin = false } = useCanEditKits();
  const { data: isStaff = false } = useIsPlatformAdmin();
  const { data: me } = useMyUserId();
  const { data: templates = [], isLoading } = useTemplates();
  const [deleting, setDeleting] = useState<Template | null>(null);
  const remove = useDeleteTemplate();
  const global = templates.filter((t) => t.visibility === "global" || t.source === "system");
  const own = templates.filter((t) => t.visibility !== "global" && t.source !== "system");
  const mine = own.filter((t) => t.created_by === access?.userId);
  const team = own.filter((t) => t.visibility === "team" && t.created_by !== access?.userId);

  return (
    <main className="mx-auto max-w-[960px] space-y-6 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div>
        <Link to="/app/ads" className="inline-flex h-11 items-center text-[13px] font-medium text-link lg:h-auto">Your ads</Link>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Templates</h1>
        <p className="mt-1 text-[14px] text-secondary-text">Save any ad as a template from its "…" menu. New ads can start from one after you choose photos.</p>
      </div>
      {access && !access.paid && <UpgradeNote />}
      {isLoading ? (
        <p className="text-[13px] text-secondary-text">Loading…</p>
      ) : (
        <>
          <Group title="My templates" list={mine} empty="No templates yet." canEdit={() => true} showShare={Boolean(access?.team)} onDelete={setDeleting} />
          {access?.team && (
            <Group title="Team templates" list={team} empty="Nobody has shared a template yet." canEdit={(t) => isAdmin || t.created_by === me} showShare onDelete={setDeleting} />
          )}
          {(global.length > 0 || isStaff) && (
            <Group
              title="Ready-made templates"
              note="Made by Gravity Pants. Anyone can start an ad from these."
              list={global}
              empty="No ready-made templates yet."
              canEdit={() => isStaff}
              showShare={isStaff}
              options={["private", "team", "global"]}
              onDelete={setDeleting}
            />
          )}
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>Ads already made from it stay as they are.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => toast("Template deleted"), onError: fail })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

const VISIBILITY_LABEL: Record<Template["visibility"], string> = {
  private: "Only me",
  team: "Shared with team",
  global: "Ready-made for everyone",
};

function Group({ title, note, list, empty, canEdit, showShare, options = ["private", "team"], onDelete }: { title: string; note?: string; list: Template[]; empty: string; canEdit: (t: Template) => boolean; showShare: boolean; options?: readonly Template["visibility"][]; onDelete: (t: Template) => void }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-[13px] text-secondary-text">{note}</p>}
      {list.length ? (
        <div className="mt-3 space-y-3">
          {list.map((t) => <Row key={t.id} t={t} editable={canEdit(t)} showShare={showShare} options={options} onDelete={() => onDelete(t)} />)}
        </div>
      ) : (
        <div className="mt-3 rounded-sm border border-dashed border-placeholder-border p-6 text-center">
          <p className="text-[14px] font-medium">{empty}</p>
          <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-secondary-text">
            Open an ad's "…" menu and choose "Save as Template". Next time you drop photos, you can start from it.
          </p>
          <Link to="/app/ads" className="mt-3 inline-flex h-11 items-center rounded-lg bg-control-fill px-4 text-[14px] font-medium lg:h-9">Go to your ads</Link>
        </div>
      )}
    </section>
  );
}

function Row({ t, editable, showShare, options = ["private", "team"], onDelete }: { t: Template; editable: boolean; showShare: boolean; options?: readonly Template["visibility"][]; onDelete: () => void }) {
  const update = useUpdateTemplate();
  const [name, setName] = useState(t.name);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm bg-card p-3 shadow-card">
      <TemplateThumb template={t} className="size-14 shrink-0" />
      <div className="min-w-0 flex-1">
        {editable ? (
          <input
            value={name}
            aria-label="Template name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const n = name.trim();
              if (n && n !== t.name) update.mutate({ id: t.id, patch: { name: n } }, { onSuccess: () => toast("Renamed"), onError: fail });
              else setName(t.name);
            }}
            className="h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] font-semibold lg:h-9 lg:text-[14px]"
          />
        ) : (
          <p className="truncate text-[14px] font-semibold">{t.name}</p>
        )}
        <p className="mt-1 text-[12px] text-secondary-text nums">{t.settings.frame_count} frames · {VISIBILITY_LABEL[t.visibility]}</p>
      </div>
      {editable && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {showShare && (
            <div className="flex flex-1 rounded-lg bg-control-fill p-0.5 sm:flex-none">
              {options.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={t.visibility === v}
                  onClick={() => v !== t.visibility && update.mutate({ id: t.id, patch: { visibility: v } }, { onError: fail })}
                  className={cn("h-11 flex-1 rounded-lg px-3 text-[13px] font-medium disabled:opacity-40 lg:h-8", t.visibility === v && "bg-card shadow-segment")}
                >
                  {v === "private" ? "Only me" : v === "team" ? "Team" : "Everyone"}
                </button>
              ))}
            </div>
          )}
          <Button variant="plain" className="h-11 text-destructive lg:h-8" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </div>
  );
}
