import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
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
import { TemplatePreview, templateFormat, templateSlides, usePrefersReducedMotion } from "@/components/templates/TemplatePreview";
import { StepBar } from "./templates.index";
import {
  useCanEditKits,
  useCreateAdFromTemplate,
  useDeleteTemplate,
  useIsPlatformAdmin,
  useTemplateAccess,
  useTemplates,
  useUpdateTemplate,
  type Template,
  type UploadProgress,
} from "@/lib/stillframe/data";
import { templateForExample } from "@/lib/site/example-template";
import { isAcceptedImage } from "@/lib/stillframe/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/templates/$slug")({
  head: () => ({
    meta: [
      { title: "Add your photos — Gravity Pants" },
      { name: "description", content: "Add photos to this template to make your ad." },
      { property: "og:title", content: "Add your photos — Gravity Pants" },
      { property: "og:description", content: "Add photos to a template to make your ad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplateDetail,
});

const fail = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

function TemplateDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates();
  const { data: access } = useTemplateAccess();
  const { data: isAdmin = false } = useCanEditKits();
  const { data: isStaff = false } = useIsPlatformAdmin();
  const create = useCreateAdFromTemplate();
  const remove = useDeleteTemplate();
  const reduced = usePrefersReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const example = slug.startsWith("example-") ? templateForExample(slug.slice(8)) : null;
  const t: Template | null = templates.find((x) => x.slug === slug || x.id === slug) ?? example;

  if (isLoading && !example) return <main className="px-4 py-10 sm:px-8"><p className="text-[13px] text-secondary-text">Loading…</p></main>;
  if (!t) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-8">
        <h1 className="text-[22px] font-bold">That template isn't available</h1>
        <p className="mt-1 text-[14px] text-secondary-text">It may have been deleted or isn't shared with this workspace.</p>
        <Link to="/app/templates" className="mt-4 inline-flex h-11 items-center rounded-lg bg-control-fill px-4 text-[14px] font-medium">See all templates</Link>
      </main>
    );
  }

  const slides = templateSlides(t);
  const total = slides.reduce((s, x) => s + x.duration_sec, 0);
  const isSystem = t.source === "system";
  const editable = !example && (isSystem || t.visibility === "global" ? isStaff : t.created_by === access?.userId || isAdmin);

  async function start(files: File[]) {
    const images = files.filter(isAcceptedImage);
    if (!images.length) return toast.error("Please choose JPG, PNG, HEIC or WebP photos");
    try {
      const id = await create.mutateAsync({ template: t!, files: images, onProgress: setUploads });
      navigate({ to: "/app/ad/$id/edit", params: { id } });
    } catch {
      setUploads([]);
      toast.error("Those photos could not be uploaded. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div className="flex items-center justify-between gap-4">
        <Link to="/app/templates" className="-ml-1 inline-flex h-11 items-center gap-0.5 text-[14px] font-medium text-link">
          <ChevronLeft className="size-4" strokeWidth={1.7} /> Templates
        </Link>
        <StepBar step={2} />
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex h-[360px] items-center justify-center rounded-sm bg-site-panel p-6 sm:h-[480px]">
          <TemplatePreview template={t} playing={!reduced} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[32px]">{t.name}</h1>
            {t.is_reusable && <span className="shrink-0 rounded-lg bg-control-fill px-2 py-0.5 text-[12px] font-medium">Reusable</span>}
          </div>
          <p className="nums mt-1 text-[14px] text-secondary-text">{templateFormat(t)} · {slides.length} slides · {total.toFixed(1)}s</p>
          {t.description && <p className="mt-3 text-[16px] text-secondary-text">{t.description}</p>}

          <h2 className="mt-6 text-[15px] font-semibold">Now add your photos</h2>
          <p className="mt-1 text-[14px] text-secondary-text">One photo per slide works best. You can change the text and timing afterwards.</p>
          <Button size="main" className="mt-4 min-h-12 w-full text-[16px] sm:w-auto lg:min-h-10 lg:text-[14px]" disabled={create.isPending} onClick={() => input.current?.click()}>
            {create.isPending ? "Uploading…" : "Choose Photos"}
          </Button>
          {uploads.length > 0 && (
            <ul className="mt-4 max-w-[420px] space-y-2">
              {uploads.map((u) => (
                <li key={u.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[12px] text-secondary-text">{u.name}</span>
                    <span className="nums text-[12px] text-secondary-text">{Math.round(u.progress * 100)}%</span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden rounded-lg bg-control-fill">
                    <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${Math.max(u.progress * 100, 4)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void start(f); }} />

          <ol className="mt-8 space-y-2">
            {slides.map((s, i) => (
              <li key={i} className="flex items-baseline gap-3 rounded-sm bg-card px-3 py-2.5 shadow-card">
                <span className="nums w-5 shrink-0 text-[13px] text-secondary-text">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{s.headline_placeholder || s.role}</span>
                  {s.subline_placeholder && <span className="block truncate text-[13px] text-secondary-text">{s.subline_placeholder}</span>}
                </span>
                <span className="nums shrink-0 text-[13px] text-secondary-text">{s.duration_sec.toFixed(1)}s</span>
              </li>
            ))}
          </ol>

          {editable && <Manage t={t} showShare={isSystem ? false : Boolean(access?.team) || isStaff} staff={isStaff} onDelete={() => setConfirmDelete(true)} />}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
          <AlertDialogDescription>Ads already made from it stay as they are.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate(t.id, { onSuccess: () => { toast("Template deleted"); navigate({ to: "/app/templates" }); }, onError: fail })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Manage({ t, showShare, staff, onDelete }: { t: Template; showShare: boolean; staff: boolean; onDelete: () => void }) {
  const update = useUpdateTemplate();
  const [name, setName] = useState(t.name);
  const options: Template["visibility"][] = staff ? ["private", "team", "global"] : ["private", "team"];
  return (
    <section className="mt-8 border-t border-separator pt-6">
      <h2 className="text-[15px] font-semibold">Manage template</h2>
      <input
        value={name}
        aria-label="Template name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const n = name.trim();
          if (n && n !== t.name) update.mutate({ id: t.id, patch: { name: n } }, { onSuccess: () => toast("Renamed"), onError: fail });
          else setName(t.name);
        }}
        className="mt-3 h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] lg:h-9 lg:text-[14px]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showShare && (
          <div className="flex rounded-lg bg-control-fill p-0.5">
            {options.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={t.visibility === v}
                onClick={() => v !== t.visibility && update.mutate({ id: t.id, patch: { visibility: v } }, { onError: fail })}
                className={cn("h-11 rounded-lg px-3 text-[13px] font-medium lg:h-8", t.visibility === v && "bg-card shadow-segment")}
              >
                {v === "private" ? "Only me" : v === "team" ? "Team" : "Everyone"}
              </button>
            ))}
          </div>
        )}
        <Button variant="plain" className="h-11 text-destructive lg:h-8" onClick={onDelete}>Delete</Button>
      </div>
    </section>
  );
}
