import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ImagePlus, Pause, Play } from "lucide-react";
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
import { MediaImage } from "@/components/stillframe/MediaImage";
import { StepBar, templateBackground, templateFormat, templateSlides, type Aspect } from "@/components/templates/TemplatePreview";
import { useCreateAdFromCustomization, useDeleteTemplate, useMyUserId, useProject, useTemplateAccess, useTemplates, useUpdateTemplate, type CustomSlide, type Template, type TemplateSlide } from "@/lib/stillframe/data";
import type { ProjectWithFrames } from "@/lib/stillframe/types";
import { templateForExample } from "@/lib/site/example-template";
import { isAcceptedImage, uploadMedia } from "@/lib/stillframe/media";
import { cn } from "@/lib/utils";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/app/templates/$slug")({
  head: () => ({
    meta: [
      { title: "Make it yours — Gravity Pants" },
      { name: "description", content: "Add a photo and a line of copy to each slide of your template." },
      { property: "og:title", content: "Make it yours — Gravity Pants" },
      { property: "og:description", content: "Add a photo and a line of copy to each slide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { from?: string } => (typeof s["from"] === "string" ? { from: s["from"] } : {}),
  component: Customize,
});

const MAX_MB = 20;
const HEADLINE_HINT = 40;
const RATIO: Record<Aspect, string> = { "9:16": "9 / 16", "1:1": "1 / 1", "16:9": "16 / 9" };
const TILE: Record<Aspect, string> = { "9:16": "w-[58px] h-[103px]", "1:1": "w-20 h-20", "16:9": "w-[120px] h-[68px]" };
const TRANSITION_LABEL: Partial<Record<TemplateSlide["transition_in"], string>> = { fade: "Fade in", "swipe-left": "Swipe left", slide: "Slide in", zoom: "Zoom", cut: "Cut" };

const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

function Customize() {
  const { slug } = Route.useParams();
  const { from } = Route.useSearch();
  const { data: fromAd, isLoading: fromLoading } = useProject(from);
  const { data: templates = [], isLoading } = useTemplates();
  const plan = usePlanAccess();
  const example = slug.startsWith("example-") ? templateForExample(slug.slice(8)) : null;
  const t: Template | null = templates.find((x) => x.slug === slug || x.id === slug) ?? example;

  if ((isLoading && !example) || (from && fromLoading)) return <main className="px-4 py-10 sm:px-8"><p className="text-[13px] text-secondary-text">Loading…</p></main>;
  if (!t) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-8">
        <h1 className="text-[22px] font-bold">That template isn't available</h1>
        <p className="mt-1 text-[14px] text-secondary-text">It may have been deleted or isn't shared with this workspace.</p>
        <Link to="/app/templates" className="mt-4 inline-flex h-11 items-center rounded-lg bg-control-fill px-4 text-[14px] font-medium">See all templates</Link>
      </main>
    );
  }
  if (t.source === "system" && !plan.canUseTemplate(t.audience)) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-8">
        <h1 className="text-[22px] font-bold">{t.name} comes with a paid plan</h1>
        <p className="mt-1 text-[14px] text-secondary-text">Upgrade to use this template for your ads.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => openUpgrade("templates")}>See plans</Button>
          <Link to="/app/templates" className="inline-flex h-10 items-center rounded-lg bg-control-fill px-4 text-[14px] font-medium">See all templates</Link>
        </div>
      </main>
    );
  }
  return <PinnedCustomize template={t} slug={slug} from={from} fromAd={from ? fromAd ?? null : null} />;
}

/** A customization in progress keeps the template version it started with, even if staff publish a newer one. */
function PinnedCustomize({ template, slug, from, fromAd }: { template: Template; slug: string; from?: string | undefined; fromAd: ProjectWithFrames | null }) {
  const { data: userId } = useMyUserId();
  const pinned = useMemo(() => {
    if (!userId || from) return template;
    try {
      const saved = JSON.parse(localStorage.getItem(`gravity-pants:customize:${userId}:${slug}`) ?? "null") as Draft | null;
      return saved?.template && saved.template.id === template.id ? saved.template : template;
    } catch { return template; }
  }, [userId, from, slug, template]);
  if (!userId) return null;
  return <CustomizeTemplate key={`${pinned.id}-${from ?? ""}`} template={pinned} slug={slug} fromAd={fromAd} />;
}

type Draft = { format: Aspect; slides: CustomSlide[]; template?: Template };

function CustomizeTemplate({ template: t, slug, fromAd }: { template: Template; slug: string; fromAd: ProjectWithFrames | null }) {
  const navigate = useNavigate();
  const { data: userId } = useMyUserId();
  const slides = useMemo(() => templateSlides(t), [t]);
  const bg = templateBackground(t);
  const create = useCreateAdFromCustomization();
  const storageKey = userId ? `gravity-pants:customize:${userId}:${slug}` : null;

  // "Make another from this kit": same text as the ad, empty photo slots for the next product.
  const blank = (): Draft => {
    const frames = fromAd ? [...fromAd.frames].sort((a, b) => a.sort_order - b.sort_order) : [];
    return {
      format: (fromAd?.primary_format as Aspect | undefined) ?? templateFormat(t),
      slides: slides.map((_, i) => ({ photo: null, headline: frames[i]?.headline?.text ?? "", subline: frames[i]?.subline?.text ?? "" })),
    };
  };
  const [draft, setDraft] = useState<Draft>(blank);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [confirm, setConfirm] = useState<number | null>(null);
  const bulkInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState(false);
  const pb = usePlayback(slides, active);
  const openButton = (cls: string) => (
    <Button size="main" className={cn("min-h-12 w-full text-[16px] lg:min-h-10 lg:text-[14px]", cls)} disabled={create.isPending || Object.values(busy).some(Boolean)} onClick={() => void open()}>
      {create.isPending ? "Creating…" : <>Open in Editor <ChevronRight className="size-4" strokeWidth={1.7} /></>}
    </Button>
  );

  // Restore the saved draft for this person + template.
  useEffect(() => {
    if (!storageKey) return;
    if (fromAd) { setLoaded(true); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Draft | null;
      if (saved?.slides?.length === slides.length) setDraft(saved);
    } catch { /* ignore a broken draft */ }
    setLoaded(true);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (storageKey && loaded) localStorage.setItem(storageKey, JSON.stringify({ ...draft, template: t }));
  }, [draft, storageKey, loaded]);

  const setSlide = (i: number, patch: Partial<CustomSlide>) =>
    setDraft((d) => ({ ...d, slides: d.slides.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  async function addPhoto(i: number, file: File) {
    if (!isAcceptedImage(file)) return setErrors((e) => ({ ...e, [i]: "That isn't an image. Use JPG, PNG, HEIC or WebP." }));
    if (file.size > MAX_MB * 1024 * 1024) return setErrors((e) => ({ ...e, [i]: `That photo is over ${MAX_MB} MB.` }));
    setErrors((e) => ({ ...e, [i]: "" }));
    setBusy((b) => ({ ...b, [i]: true }));
    try {
      const photo = await uploadMedia(file, "photo");
      setSlide(i, { photo });
    } catch {
      setErrors((e) => ({ ...e, [i]: "That photo couldn't be uploaded. Try again." }));
    } finally {
      setBusy((b) => ({ ...b, [i]: false }));
    }
  }

  function addMany(files: File[]) {
    const empty = draft.slides.map((s, i) => (s.photo || busy[i] ? -1 : i)).filter((i) => i >= 0);
    files.slice(0, empty.length).forEach((f, k) => void addPhoto(empty[k]!, f));
    if (files.length > empty.length) toast(`${files.length - empty.length} photo${files.length - empty.length === 1 ? "" : "s"} left over — every slide already has one.`);
  }

  async function open(force = false) {
    const missing = draft.slides.filter((s) => !s.photo).length;
    if (missing && !force) return setConfirm(missing);
    setConfirm(null);
    try {
      const id = await create.mutateAsync({ template: t, format: draft.format, slides: draft.slides });
      if (storageKey) localStorage.removeItem(storageKey);
      navigate({ to: "/app/ad/$id/edit", params: { id } });
    } catch {
      toast.error("The ad couldn't be created. Try again.");
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-48 pt-6 sm:px-8 sm:pt-8 md:pb-16">
      <Link to="/app/templates" className="-ml-1 inline-flex h-11 items-center gap-0.5 text-[14px] text-link">
        <ChevronLeft className="size-4" strokeWidth={1.7} /> Templates
      </Link>
      <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.02em] sm:text-[40px]">Make it yours.</h1>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="text-[15px] text-secondary-text">{t.name} · add a photo and a line of copy to each slide.</p>
        <StepBar step={2} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <Button variant="secondary" className="h-11 lg:h-9" onClick={() => bulkInput.current?.click()}>
            <ImagePlus className="size-4" strokeWidth={1.7} /> Add all photos at once
          </Button>
          <input ref={bulkInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; addMany(f); }} />

          <ol className="mt-4 space-y-3 md:space-y-0 md:overflow-hidden md:rounded-sm md:bg-card md:shadow-card md:[&>li+li]:border-t md:[&>li+li]:border-border">
            {slides.map((s, i) => (
              <SlideRow
                key={i}
                index={i}
                slide={s}
                value={draft.slides[i]!}
                format={draft.format}
                bg={bg}
                active={active === i}
                busy={Boolean(busy[i])}
                error={errors[i]}
                onFocus={() => setActive(i)}
                onFile={(f) => void addPhoto(i, f)}
                onRemove={() => setSlide(i, { photo: null })}
                onChange={(patch) => setSlide(i, patch)}
              />
            ))}
          </ol>

          {t.source !== "system" && <ManageTemplate template={t} />}
        </section>

        <aside className="hidden md:block lg:sticky lg:top-20 lg:self-start">
          <FormatSwitch value={draft.format} onChange={(f) => setDraft((d) => ({ ...d, format: f }))} />
          <div className="mt-3 flex h-[470px] items-center justify-center rounded-sm bg-card p-5 shadow-card">
            <div className={cn("relative", draft.format === "16:9" ? "w-full" : "h-full")} style={{ aspectRatio: RATIO[draft.format], maxHeight: "100%" }}>
              <Stage slides={slides} values={draft.slides} format={draft.format} bg={bg} pb={pb} className="h-full w-full shadow-popover" />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
                <button type="button" onClick={pb.toggle} aria-label={pb.playing ? "Pause" : "Play"} className="flex size-9 items-center justify-center rounded-full bg-card/25 text-primary-foreground backdrop-blur">
                  {pb.playing ? <Pause className="size-3.5 fill-current" strokeWidth={1.7} /> : <Play className="size-3.5 fill-current" strokeWidth={1.7} />}
                </button>
                <span className="nums text-[11px] text-primary-foreground/90">{clock(pb.time)} / {clock(pb.total)}</span>
              </div>
            </div>
          </div>
          {openButton("mt-5")}
          <p className="mt-2 text-center text-[13px] text-secondary-text">Fine-tune timing, transitions and type in the timeline editor.</p>
        </aside>
      </div>

      {/* Phones: preview lives in a sticky bottom bar; tap the thumbnail for a full-screen sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-card px-4 pt-3 hairline-t md:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSheet(true)} aria-label="Open full-screen preview" className="flex h-14 min-w-11 shrink-0 items-center justify-center">
            <Stage slides={slides} values={draft.slides} format={draft.format} bg={bg} pb={pb} className={draft.format === "16:9" ? "w-[88px]" : "h-14"} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="nums truncate text-[14px] font-medium">Slide {pb.index + 1} of {slides.length}</p>
            <p className="nums text-[13px] text-secondary-text">{clock(pb.time)} / {clock(pb.total)}</p>
          </div>
          <Button variant="secondary" size="icon" className="size-11 shrink-0 rounded-full" aria-label={pb.playing ? "Pause" : "Play"} onClick={pb.toggle}>
            {pb.playing ? <Pause className="size-4" strokeWidth={1.7} /> : <Play className="size-4" strokeWidth={1.7} />}
          </Button>
        </div>
        {openButton("mt-3")}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="flex h-dvh flex-col gap-4 bg-canvas px-4 pt-[max(16px,env(safe-area-inset-top))]" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <SheetTitle className="text-[17px] font-semibold">Preview</SheetTitle>
          <FormatSwitch value={draft.format} onChange={(f) => setDraft((d) => ({ ...d, format: f }))} />
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-sm bg-site-panel p-4">
            <Stage slides={slides} values={draft.slides} format={draft.format} bg={bg} pb={pb} className={draft.format === "9:16" ? "h-full" : "w-full"} />
          </div>
          <PlayControls pb={pb} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{confirm === 1 ? "1 slide has" : `${confirm} slides have`} no photo yet. Open anyway?</AlertDialogTitle>
          <AlertDialogDescription>Those slides will show the template's background color until you add a photo in the editor.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => void open(true)}>Open</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function SlideRow({ index, slide, value, format, bg, active, busy, error, onFocus, onFile, onRemove, onChange }: {
  index: number; slide: TemplateSlide; value: CustomSlide; format: Aspect; bg: string; active: boolean; busy: boolean; error?: string | undefined;
  onFocus: () => void; onFile: (f: File) => void; onRemove: () => void; onChange: (p: Partial<CustomSlide>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const transition = index > 0 ? TRANSITION_LABEL[slide.transition_in] : undefined;
  return (
    <li
      onFocusCapture={onFocus}
      onClick={onFocus}
      onPaste={(e) => { const f = Array.from(e.clipboardData.files)[0]; if (f) { e.preventDefault(); onFile(f); } }}
      className={cn("flex items-center gap-4 rounded-sm bg-card p-3 shadow-card md:rounded-none md:px-4 md:py-3.5 md:shadow-none", active && "ring-2 ring-inset ring-primary/40")}
    >
      <div className={cn("group relative shrink-0 overflow-hidden rounded-sm", TILE[format])}>
        <button
          type="button"
          aria-label={value.photo ? `Replace photo for slide ${index + 1}` : `Add photo for slide ${index + 1}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          className={cn(
            "flex h-full w-full items-center justify-center border-2 border-dashed focus-visible:outline-2 focus-visible:outline-primary",
            value.photo ? "border-transparent" : drag ? "border-primary bg-control-fill" : "border-placeholder-border bg-canvas",
          )}
        >
          {value.photo ? (
            <MediaImage path={value.photo.path} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : busy ? (
            <span className="text-[11px] text-secondary-text">Uploading…</span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-secondary-text">
              <span className="text-[18px] font-light leading-none">+</span>Photo
            </span>
          )}
        </button>
        {value.photo && (
          <div className="absolute inset-0 flex flex-col items-stretch justify-center gap-1 bg-foreground/55 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-card px-1 py-1 text-[11px] font-medium">Replace</button>
            <button type="button" onClick={onRemove} className="rounded-lg bg-card px-1 py-1 text-[11px] font-medium text-destructive">Remove</button>
          </div>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="nums text-[12px] text-secondary-text">
          <b className="font-semibold text-foreground">Slide {index + 1}</b> · {slide.role} · {slide.duration_sec.toFixed(1)}s{transition ? ` · ${transition}` : ""}
        </p>
        <input
          value={value.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder={slide.headline_placeholder}
          aria-label={`Slide ${index + 1} headline`}
          className="mt-1.5 h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] font-semibold placeholder:font-normal placeholder:text-secondary-text lg:h-9 lg:text-[14px]"
        />
        {value.headline.length > HEADLINE_HINT && (
          <p className="nums mt-1 text-[12px] text-secondary-text">{value.headline.length} characters. Shorter headlines read better — try {HEADLINE_HINT} or fewer.</p>
        )}
        <input
          value={value.subline}
          onChange={(e) => onChange({ subline: e.target.value })}
          placeholder={slide.subline_placeholder}
          aria-label={`Slide ${index + 1} subline`}
          className="mt-1.5 h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] placeholder:text-secondary-text lg:h-9 lg:text-[14px]"
        />
        {value.photo && (
          <button type="button" onClick={onRemove} className="-ml-1 h-11 px-1 text-[14px] font-medium text-destructive md:hidden">Remove photo</button>
        )}
        {error && <p role="alert" className="mt-1 text-[12px] text-destructive">{error}</p>}
      </div>
    </li>
  );
}

type Playback = { playing: boolean; toggle: () => void; time: number; total: number; index: number; key: string };

/** One shared clock for the side preview, the phone bottom bar and the full-screen sheet. */
function usePlayback(slides: TemplateSlide[], active: number): Playback {
  const total = slides.reduce((s, x) => s + x.duration_sec, 0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const last = useRef(0);
  useEffect(() => { setPlaying(false); setTime(0); }, [active]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setTime((t) => (t + dt >= total ? 0 : t + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  let index = active;
  if (playing || time > 0) {
    let acc = 0;
    index = slides.findIndex((s) => (acc += s.duration_sec) > time);
    if (index < 0) index = slides.length - 1;
  }
  // While editing, restart the text animation whenever the focused slide changes.
  const key = playing || time > 0 ? `p-${index}` : `e-${index}`;
  return { playing, toggle: () => setPlaying((p) => !p), time, total, index, key };
}

function Stage({ slides, values, format, bg, pb, className }: { slides: TemplateSlide[]; values: CustomSlide[]; format: Aspect; bg: string; pb: Playback; className?: string }) {
  const slide = slides[pb.index];
  const value = values[pb.index];
  return (
    <div className={cn("relative overflow-hidden rounded-sm", className)} style={{ aspectRatio: RATIO[format], background: bg, maxHeight: "100%" }}>
      {slide && (
        <div key={pb.key} className={cn("tpl-slide absolute inset-0", pb.playing && pb.index > 0 && `tpl-in-${slide.transition_in}`)} style={{ background: bg }}>
          {value?.photo && (
            <div className={cn("absolute inset-0", slide.photo_motion !== "none" && `tpl-photo-${slide.photo_motion}`)}>
              <MediaImage path={value.photo.path} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-foreground/30" />
            </div>
          )}
          <div className="tpl-text absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center">
            <p className={cn("tpl-headline font-bold leading-[1.05]", `tpl-text-${slide.text_animation}`, !value?.headline && "opacity-50")}>{value?.headline || slide.headline_placeholder}</p>
            {(value?.subline || slide.subline_placeholder) && (
              <p className={cn("tpl-subline mt-[4%] leading-snug", `tpl-text-${slide.text_animation}`, !value?.subline && "opacity-50")} style={{ animationDelay: "120ms" }}>{value?.subline || slide.subline_placeholder}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayControls({ pb }: { pb: Playback }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="icon" className="size-11 shrink-0 rounded-full lg:size-9" aria-label={pb.playing ? "Pause" : "Play"} onClick={pb.toggle}>
        {pb.playing ? <Pause className="size-4" strokeWidth={1.7} /> : <Play className="size-4" strokeWidth={1.7} />}
      </Button>
      <span className="nums text-[13px] text-secondary-text">{clock(pb.time)} / {clock(pb.total)}</span>
    </div>
  );
}

/** Rename, re-share or delete a template you saved. Ready-made (system) templates are managed by staff. */
function ManageTemplate({ template: t }: { template: Template }) {
  const navigate = useNavigate();
  const { data: userId } = useMyUserId();
  const { data: access } = useTemplateAccess();
  const update = useUpdateTemplate();
  const del = useDeleteTemplate();
  const [name, setName] = useState(t.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mine = t.created_by === userId;
  const canManageTeam = t.visibility === "team" && Boolean(access?.team);
  if (!mine && !canManageTeam) return null;

  const fail = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");
  const renamed = name.trim() && name.trim() !== t.name;

  return (
    <section className="mt-8 rounded-sm bg-card p-4 shadow-card sm:p-5">
      <h2 className="text-[15px] font-semibold">Manage template</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 space-y-1.5">
          <span className="text-[12px] text-secondary-text">Template name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] lg:h-10 lg:text-[14px]"
          />
        </label>
        <Button
          variant="secondary"
          className="h-11 lg:h-10"
          disabled={!renamed || update.isPending}
          onClick={() => update.mutate({ id: t.id, patch: { name: name.trim() } }, { onSuccess: () => toast.success("Template renamed"), onError: fail })}
        >
          {update.isPending ? "Saving…" : "Save name"}
        </Button>
      </div>

      {access?.team && (
        <div className="mt-4 space-y-1.5">
          <span className="text-[12px] text-secondary-text">Who can use it?</span>
          <div className="flex rounded-lg bg-control-fill p-0.5">
            {([["private", "Only me"], ["team", `Everyone in ${access.name}`]] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={t.visibility === v}
                disabled={update.isPending}
                onClick={() => update.mutate({ id: t.id, patch: { visibility: v } }, { onError: fail })}
                className={cn("h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-[13px] font-medium lg:h-8", t.visibility === v && "bg-card shadow-segment")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <Button variant="destructive-plain" className="h-11 lg:h-9" onClick={() => setConfirmDelete(true)}>
          Delete template
        </Button>
        <p className="mt-1 text-[12px] text-secondary-text">Ads already made from this template keep working.</p>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete “{t.name}”?</AlertDialogTitle>
          <AlertDialogDescription>This can't be undone. Ads already made from it are not affected.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(t.id, {
                  onSuccess: () => {
                    toast.success("Template deleted");
                    void navigate({ to: "/app/templates" });
                  },
                  onError: fail,
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function FormatSwitch({ value, onChange }: { value: Aspect; onChange: (f: Aspect) => void }) {
  return (
    <div className="flex rounded-lg bg-control-fill p-0.5" role="radiogroup" aria-label="Format">
      {(["1:1", "9:16", "16:9"] as Aspect[]).map((f) => (
        <button key={f} type="button" role="radio" aria-checked={value === f} onClick={() => onChange(f)}
          className={cn("nums h-11 flex-1 rounded-lg text-[14px] font-medium lg:h-9", value === f && "bg-card shadow-segment")}>
          {f}
        </button>
      ))}
    </div>
  );
}
