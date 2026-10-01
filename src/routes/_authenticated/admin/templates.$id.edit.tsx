import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronUp, CircleCheck, Copy, GripVertical, History, ImagePlus, Minus, Pause, Play, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { TemplateCanvas, clock, renderThumbnail, useDocPlayback } from "@/components/admin/TemplateCanvas";
import { adminTemplateHistory, adminTemplateGet, adminTemplatePublish, adminTemplateSave, adminTemplateUpload } from "@/lib/stillframe/admin-templates.functions";
import {
  blankSlide, docDuration, docFromRow, label, MAX_SLIDES, PHOTO_MOTIONS, PLAN_AUDIENCE, slugify, TEXT_ANIMS, TRANSITIONS,
  type DocSlide, type TemplateDoc,
} from "@/lib/stillframe/template-doc";
import { POPULAR, WEIGHT_NAMES } from "@/lib/stillframe/fonts";
import { ANCHORS } from "@/render/renderFrame";
import type { Format } from "@/lib/stillframe/types";
import { cn } from "@/lib/utils";
import { adminTemplatesKey, audienceLabel, TemplateThumb } from "@/components/admin/TemplateAdminBits";

export const Route = createFileRoute("/_authenticated/admin/templates/$id/edit")({
  head: () => ({ meta: [
    { title: "Template builder — Gravity Pants Admin" },
    { name: "description", content: "Edit a ready-made Gravity Pants template." },
    { property: "og:title", content: "Template builder — Gravity Pants Admin" },
    { property: "og:description", content: "Edit a ready-made Gravity Pants template." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: BuilderPage,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const FORMATS: Format[] = ["9:16", "1:1", "16:9"];
const inp = "h-9 w-full min-w-0 rounded-sm bg-canvas px-2.5 text-[14px] shadow-[inset_0_0_0_0.5px_var(--color-border)] outline-none focus:bg-card focus:ring-2 focus:ring-primary/40";
const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
const POS_LABEL = (a: string) => a.replace("middle-", "middle ").replace("-", " ").replace(/^\w/, (c) => c.toUpperCase());

function BuilderPage() {
  const { id } = Route.useParams();
  const get = useServerFn(adminTemplateGet);
  const { data: row, refetch } = useQuery({ queryKey: [...adminTemplatesKey, id], queryFn: () => get({ data: { id } }) });
  if (!row) return <p className="text-[13px] text-secondary-text">Loading…</p>;
  return <Builder key={row.updated_at} row={row} refetch={() => void refetch()} />;
}

function Builder({ row, refetch }: { row: any; refetch: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(adminTemplateSave);
  const publish = useServerFn(adminTemplatePublish);
  const upload = useServerFn(adminTemplateUpload);
  const saved = useMemo(() => docFromRow(row), [row]);
  const [doc, setDoc] = useState<TemplateDoc>(saved);
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<Format>(saved.format);
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved);
  const pb = useDocPlayback(doc);
  const [history, setHistory] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Slug follows the name until someone types their own.
  const [slugTouched, setSlugTouched] = useState(() => !!saved.slug && !saved.slug.startsWith("untitled-") && saved.slug !== slugify(saved.name));
  const errors = [
    !doc.name.trim() && "Add a name.",
    !doc.slides.length && "Add at least one slide.",
    doc.slides.some((s) => !(s.duration_sec >= 0.5 && s.duration_sec <= 10)) && "Every slide needs a duration between 0.5 and 10 seconds.",
  ].filter(Boolean) as string[];
  const blocker = useBlocker({ shouldBlockFn: () => dirty && !busy, withResolver: true, enableBeforeUnload: false });

  useEffect(() => setPreviewFormat(doc.format), [doc.format]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (p: Partial<TemplateDoc>) => setDoc((d) => ({ ...d, ...p }));
  const setStyle = (p: Partial<TemplateDoc["style"]>) => setDoc((d) => ({ ...d, style: { ...d.style, ...p } }));
  const setSlide = (i: number, p: Partial<DocSlide>) => setDoc((d) => ({ ...d, slides: d.slides.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const moveSlide = (i: number, by: number) => moveTo(i, i + by);
  const moveTo = (from: number, to: number) =>
    setDoc((d) => {
      const s = [...d.slides];
      const [x] = s.splice(from, 1);
      s.splice(Math.max(0, Math.min(s.length, to)), 0, x!);
      return { ...d, slides: s };
    });
  const check = () => { if (errors.length) { toast.error(errors[0]!); return false; } return true; };

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: adminTemplatesKey });
    await qc.invalidateQueries({ queryKey: ["templates"] });
    refetch();
  };
  async function saveDraft() {
    if (!check()) return;
    setBusy(true);
    try {
      await save({ data: { id: row.id, doc: { ...doc, slug: slugify(doc.slug || doc.name) } } });
      toast(row.status === "published" ? "Draft saved. Customers still see the published version." : "Draft saved");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't save");
    } finally {
      setBusy(false);
    }
  }
  async function doPublish(opts: { audience: string[]; newBadge: boolean; featured: boolean }) {
    setBusy(true);
    try {
      await publish({ data: { id: row.id, doc: { ...doc, slug: slugify(doc.slug || doc.name) }, audience: opts.audience as any, newBadge: opts.newBadge, featured: opts.featured } });
      toast(`Published \u201c${doc.name}\u201d`);
      setPublishing(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't publish");
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    const { path } = await upload({ data: { id: row.id, dataUrl: await readFile(file) } });
    return path;
  }

  const status = row.status as string;
  const statusText = status === "published" ? `Published · v${row.version}` : status === "archived" ? "Archived" : row.version ? `Draft · last published v${row.version}` : "Draft";

  return (
    <div className="-mt-2">
      <header className="sticky top-14 z-20 -mx-4 mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 bg-canvas/95 px-4 py-3 backdrop-blur hairline-b sm:-mx-0 sm:px-0">
        <Link to="/admin/templates" className="inline-flex h-9 items-center gap-0.5 text-[14px] text-link"><ChevronLeft className="size-4" strokeWidth={1.7} /> Templates</Link>
        <span className="text-secondary-text">/</span>
        <h1 className="min-w-0 truncate text-[18px] font-semibold">{doc.name || "Untitled"}</h1>
        <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium", status === "published" ? "bg-success-soft text-success-text" : "bg-control-fill text-secondary-text")}>
          <span className={cn("size-1.5 rounded-full", status === "published" ? "bg-success-text" : "bg-secondary-text")} />{statusText}
        </span>
        {dirty ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-warning-text"><span className="size-1.5 rounded-full bg-warning-text" />Unsaved changes</span>
        ) : row.draft && status === "published" ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-warning-text"><span className="size-1.5 rounded-full bg-warning-text" />Draft not published yet</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setHistory(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[14px] hover:bg-control-fill"><History className="size-4" strokeWidth={1.7} /> History</button>
          <Button variant="secondary" size="header" disabled={busy || (!dirty && status !== "draft")} onClick={() => void saveDraft()}>Save draft</Button>
          <Button size="header" disabled={busy} onClick={() => { if (check()) setPublishing(true); }}>Publish…</Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Panel n={1} title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input className={inp} value={doc.name} maxLength={60} onChange={(e) => set(slugTouched ? { name: e.target.value } : { name: e.target.value, slug: slugify(e.target.value) })} /></Field>
              <Field label="Slug">
                <div className={cn(inp, "flex items-center gap-1")}>
                  <span className="text-secondary-text">/templates/</span>
                  <input className="min-w-0 flex-1 bg-transparent outline-none" value={doc.slug} maxLength={60} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }); }} />
                </div>
              </Field>
              <Field label="Description" className="sm:col-span-2" hint={`${doc.description.length} / 120`}>
                <input className={inp} value={doc.description} maxLength={120} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Format"><Seg value={doc.format} options={FORMATS} onChange={(f) => set({ format: f })} /></Field>
              <div className="flex flex-col justify-end gap-2">
                <Toggle label="Reusable kit" sub={"\u201cMake another from this kit\u201d"} checked={doc.is_reusable} onChange={(v) => set({ is_reusable: v })} />
                <Toggle label="Featured" sub="pinned first" checked={doc.featured} onChange={(v) => set({ featured: v })} />
              </div>
            </div>
          </Panel>

          <Panel n={2} title="Style" aside="Applies to every slide">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Background"><ColorInput value={doc.style.background_color} onChange={(v) => setStyle({ background_color: v })} /></Field>
              <Field label="Headline font"><FontSelect font={doc.style.headline.font} weight={doc.style.headline.weight} onChange={(font, weight) => setStyle({ headline: { ...doc.style.headline, font, weight } })} /></Field>
              <Field label="Headline size"><Px value={doc.style.headline.size_px} onChange={(v) => setStyle({ headline: { ...doc.style.headline, size_px: v } })} /></Field>
              <Field label="Headline color"><ColorInput value={doc.style.headline.color} onChange={(v) => setStyle({ headline: { ...doc.style.headline, color: v } })} /></Field>
              <div className="hidden lg:block" />
              <Field label="Subline font"><FontSelect font={doc.style.subline.font} weight={doc.style.subline.weight ?? 500} onChange={(font, weight) => setStyle({ subline: { ...doc.style.subline, font, weight } })} /></Field>
              <Field label="Subline size"><Px value={doc.style.subline.size_px} onChange={(v) => setStyle({ subline: { ...doc.style.subline, size_px: v } })} /></Field>
              <Field label="Subline color"><ColorInput value={doc.style.subline.color} onChange={(v) => setStyle({ subline: { ...doc.style.subline, color: v } })} /></Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-8">
              <PosGrid title="Text position" value={doc.style.text_position} onChange={(v) => setStyle({ text_position: v })} />
              <PosGrid title="Logo position" note="template default" value={doc.style.logo_position} onChange={(v) => setStyle({ logo_position: v })} />
            </div>
            <LogoEditor style={doc.style} onChange={setStyle} upload={uploadImage} />
          </Panel>

          <Panel n={3} title="Slides" aside={<span className="nums">{doc.slides.length} of max {MAX_SLIDES} · {docDuration(doc).toFixed(1)} s total</span>}>
            <ol className="space-y-2">
              {doc.slides.map((s, i) => (
                <SlideCard
                  key={i}
                  index={i}
                  slide={s}
                  count={doc.slides.length}
                  open={open === i}
                  onToggle={() => { setOpen(open === i ? -1 : i); pb.seek(i); }}
                  onChange={(p) => setSlide(i, p)}
                  onMove={(by) => { moveSlide(i, by); setOpen(i + by); }}
                  onDuplicate={() => { if (doc.slides.length < MAX_SLIDES) setDoc((d) => ({ ...d, slides: [...d.slides.slice(0, i + 1), { ...s }, ...d.slides.slice(i + 1)] })); }}
                  onDelete={() => { if (doc.slides.length > 1) setDoc((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== i) })); }}
                  upload={uploadImage}
                  format={doc.format}
                  logoShowOn={doc.style.logo_show_on ?? "all"}
                  textPosition={doc.style.text_position}
                  colors={{ headline: doc.style.headline.color, subline: doc.style.subline.color }}
                  previewOn={doc.slides.filter((x) => x.preview !== false).length}
                  dragging={dragFrom === i}
                  onDragStart={() => setDragFrom(i)}
                  onDragEnd={() => setDragFrom(null)}
                  onDrop={() => { if (dragFrom !== null && dragFrom !== i) { moveTo(dragFrom, i); setOpen(i); } setDragFrom(null); }}
                />
              ))}
            </ol>
            <Button variant="secondary" size="header" className="mt-3" disabled={doc.slides.length >= MAX_SLIDES} onClick={() => { setDoc((d) => ({ ...d, slides: [...d.slides, blankSlide(d.slides.length + 1)] })); setOpen(doc.slides.length); }}>
              <Plus className="size-4" strokeWidth={1.7} /> Add slide
            </Button>
          </Panel>

          <Panel n={4} title="Thumbnail" aside="Shown on the template card">
            <ThumbnailEditor doc={doc} onChange={(p) => set({ thumbnail_url: p })} upload={uploadImage} />
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-[136px] xl:self-start">
          <section className="rounded-sm bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Preview</h2>
              <Seg value={previewFormat} options={FORMATS} onChange={setPreviewFormat} small />
            </div>
            <div className="mt-4 flex h-[440px] items-center justify-center rounded-sm bg-canvas">
              <TemplateCanvas doc={doc} format={previewFormat} time={pb.time} width={previewFormat === "9:16" ? 236 : previewFormat === "1:1" ? 300 : 320} className="rounded-sm shadow-card" />
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={pb.toggle} aria-label={pb.playing ? "Pause" : "Play"} className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
                {pb.playing ? <Pause className="size-4" strokeWidth={1.7} /> : <Play className="size-4" strokeWidth={1.7} />}
              </button>
              <span className="nums text-[14px]"><b className="font-semibold">{clock(pb.time)}</b> <span className="text-secondary-text">/ {clock(pb.total)}</span></span>
            </div>
            <div className="relative mt-3 flex gap-1">
              {doc.slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { pb.seek(i); setOpen(i); }}
                  className={cn("min-w-0 rounded-sm px-2 py-1 text-left text-[11px] text-background", pb.index === i ? "ring-2 ring-primary ring-offset-1" : "opacity-80")}
                  style={{ flex: s.duration_sec, background: doc.style.background_color }}
                >
                  <span className="block truncate font-semibold">{i + 1} {s.role}</span>
                  <span className="nums block opacity-75">{s.duration_sec.toFixed(1)}s</span>
                </button>
              ))}
              <span className="pointer-events-none absolute -top-1 bottom-0 w-0.5 bg-destructive" style={{ left: `${(pb.time / Math.max(0.01, pb.total)) * 100}%` }} />
            </div>
            <p className="mt-3 text-center text-[12px] text-secondary-text">Plays with sample photos and placeholder text. Users never see placeholders in their exports.</p>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-3 bg-canvas/95 px-4 py-3 backdrop-blur hairline-t sm:-mx-0 sm:px-0">
        <span className={cn("text-[13px]", errors.length ? "text-destructive" : "text-secondary-text")}>
          {errors[0] ?? (dirty ? "Unsaved changes" : "All changes saved")}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="header" disabled={busy || (!dirty && status !== "draft")} onClick={() => void saveDraft()}>Save draft</Button>
          <Button size="header" disabled={busy} onClick={() => { if (check()) setPublishing(true); }}>Publish…</Button>
        </div>
      </div>

      <Dialog open={blocker.status === "blocked"} onOpenChange={(o) => { if (!o) blocker.reset?.(); }}>
        <DialogContent className="max-w-[420px]">
          <DialogTitle className="text-[17px] font-semibold">Leave without saving?</DialogTitle>
          <DialogDescription className="text-[14px] text-secondary-text">Your changes to this template will be lost.</DialogDescription>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" size="header" onClick={() => blocker.reset?.()}>Keep editing</Button>
            <Button variant="destructive" size="header" onClick={() => blocker.proceed?.()}>Leave</Button>
          </div>
        </DialogContent>
      </Dialog>

      <HistoryDialog id={row.id} open={history} onOpenChange={setHistory} />
      <PublishDialog open={publishing} onOpenChange={setPublishing} row={row} doc={doc} busy={busy} onPublish={doPublish} />
    </div>
  );
}

function Panel({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-sm bg-card shadow-card">
      <div className="flex items-center gap-2.5 px-5 pt-4">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">{n}</span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {aside && <span className="ml-auto text-[12px] text-secondary-text">{aside}</span>}
      </div>
      <div className="p-5 pt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-secondary-text">{label}</span>
      {children}
      {hint && <span className="nums self-end text-[11px] text-secondary-text">{hint}</span>}
    </label>
  );
}

function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: T[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={cn("flex gap-0.5 rounded-lg bg-control-fill p-0.5", small ? "h-8" : "h-9")} role="radiogroup">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={cn("nums flex-1 rounded-md px-3 text-[13px] font-medium", value === o ? "bg-card font-semibold shadow-segment" : "text-secondary-text")}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-9 items-center justify-between gap-3 text-[14px]">
      <span>{label} <span className="text-[12px] text-secondary-text">· {sub}</span></span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className={cn(inp, "flex items-center gap-2")}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-5 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0" aria-label="Pick color" />
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toUpperCase()); }}
        className="nums min-w-0 flex-1 bg-transparent uppercase outline-none"
      />
    </div>
  );
}

function Px({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className={cn(inp, "flex items-center gap-1")}>
      <input type="number" min={10} max={300} value={value} onChange={(e) => onChange(Math.max(10, Math.min(300, Number(e.target.value) || 10)))} className="nums min-w-0 flex-1 bg-transparent outline-none" />
      <span className="text-secondary-text">px</span>
    </div>
  );
}

function FontSelect({ font, weight, onChange }: { font: string | null; weight: number; onChange: (f: string | null, w: number) => void }) {
  const fonts = Array.from(new Set([...(font ? [font] : []), ...POPULAR]));
  const weights = [300, 400, 500, 600, 700, 800, 900];
  return (
    <div className="flex gap-1">
      <select value={font ?? ""} onChange={(e) => onChange(e.target.value || null, weight)} className={cn(inp, "flex-1")} aria-label="Font">
        <option value="">Default (SF Pro)</option>
        {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select value={weight} onChange={(e) => onChange(font, Number(e.target.value))} className={cn(inp, "w-[92px]")} aria-label="Weight">
        {weights.map((w) => <option key={w} value={w}>{WEIGHT_NAMES[w] ?? w}</option>)}
      </select>
    </div>
  );
}

function PosGrid({ title, note, value, onChange, only = () => true }: { title: string; note?: string; value: string; onChange: (v: string) => void; only?: (a: string) => boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-3 gap-0.5 rounded-sm bg-canvas p-1 shadow-card" role="radiogroup" aria-label={title}>
        {ANCHORS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={value === a}
            aria-label={POS_LABEL(a)}
            disabled={!only(a)}
            onClick={() => onChange(a)}
            className={cn("size-5 rounded-[2px]", value === a ? "bg-primary" : "bg-card shadow-card", !only(a) && "opacity-30")}
          />
        ))}
      </div>
      <div>
        <p className="text-[13px]">{title}</p>
        <p className="text-[12px] text-secondary-text">{POS_LABEL(value)}{note ? ` · ${note}` : ""}</p>
      </div>
    </div>
  );
}

function SlideCard({ index, slide: s, count, open, onToggle, onChange, onMove, onDuplicate, onDelete, upload, format, logoShowOn, textPosition, colors, previewOn, dragging, onDragStart, onDragEnd, onDrop }: {
  index: number; slide: DocSlide; count: number; open: boolean; onToggle: () => void; onChange: (p: Partial<DocSlide>) => void;
  onMove: (by: number) => void; onDuplicate: () => void; onDelete: () => void; upload: (f: File) => Promise<string>;
  format: Format;
  logoShowOn: NonNullable<TemplateDoc["style"]["logo_show_on"]>;
  textPosition: string;
  colors: { headline: string; subline: string };
  previewOn: number;
  dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onDrop: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const summary = [`${s.duration_sec.toFixed(1)}s`, index === 0 ? "No transition" : label(TRANSITIONS, s.transition_in), label(TEXT_ANIMS, s.text_animation), s.photo_motion !== "none" ? label(PHOTO_MOTIONS, s.photo_motion) : null].filter(Boolean).join(" · ");
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try { onChange({ sample_photo: await upload(f), photo_focus: { x: 0.5, y: 0.5 }, photo_zoom: 1 }); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); }
  };
  return (
    <li className={cn("rounded-sm shadow-card", open && "ring-2 ring-primary", dragging && "opacity-50")} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span draggable onDragStart={onDragStart} onDragEnd={onDragEnd} className="cursor-grab" title="Drag to reorder"><GripVertical className="size-4 text-icon" strokeWidth={1.7} aria-hidden /></span>
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className={cn("nums flex size-[22px] shrink-0 items-center justify-center rounded-sm text-[11px] font-semibold", open ? "bg-primary text-primary-foreground" : "bg-control-fill")}>{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold">{s.role || `Slide ${index + 1}`}</span>
            <span className="nums block truncate text-[12px] text-secondary-text">{summary}{open ? "" : ` · \u201c${s.headline_placeholder}\u201d`}</span>
          </span>
        </button>
        <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="size-4" strokeWidth={1.7} /></IconBtn>
        <IconBtn label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}><ChevronDown className="size-4" strokeWidth={1.7} /></IconBtn>
        <IconBtn label="Duplicate slide" disabled={count >= MAX_SLIDES} onClick={onDuplicate}><Copy className="size-4" strokeWidth={1.7} /></IconBtn>
        <IconBtn label="Delete slide" disabled={count <= 1} onClick={onDelete}><Trash2 className="size-4" strokeWidth={1.7} /></IconBtn>
      </div>
      {open && (
        <div className="grid gap-3 px-4 pb-4 pt-1 hairline-t sm:grid-cols-3 sm:pl-12">
          <Field label="Role label"><input className={inp} value={s.role} maxLength={40} onChange={(e) => onChange({ role: e.target.value })} /></Field>
          <Field label="Duration">
            <div className={cn(inp, "flex items-center justify-between px-1")}>
              <button type="button" aria-label="Shorter" onClick={() => onChange({ duration_sec: Math.max(0.5, Math.round((s.duration_sec - 0.1) * 10) / 10) })} className="flex size-7 items-center justify-center"><Minus className="size-3.5" strokeWidth={1.7} /></button>
              <span className="nums">{s.duration_sec.toFixed(1)} s</span>
              <button type="button" aria-label="Longer" onClick={() => onChange({ duration_sec: Math.min(10, Math.round((s.duration_sec + 0.1) * 10) / 10) })} className="flex size-7 items-center justify-center"><Plus className="size-3.5" strokeWidth={1.7} /></button>
            </div>
          </Field>
          <Field label="Transition in">
            <select className={inp} value={s.transition_in} disabled={index === 0} onChange={(e) => onChange({ transition_in: e.target.value as DocSlide["transition_in"] })}>
              {TRANSITIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Text animation">
            <select className={inp} value={s.text_animation} onChange={(e) => onChange({ text_animation: e.target.value as DocSlide["text_animation"] })}>
              {TEXT_ANIMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Photo motion">
            <select className={inp} value={s.photo_motion} onChange={(e) => onChange({ photo_motion: e.target.value as DocSlide["photo_motion"] })}>
              {PHOTO_MOTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <div className="flex flex-col gap-1 sm:col-span-3 sm:flex-row sm:gap-10">
            {logoShowOn === "selected" && <Toggle label="Show logo" sub="on this slide" checked={s.logo_visible ?? true} onChange={(v) => onChange({ logo_visible: v })} />}
            <span title={previewOn <= 1 && s.preview !== false ? "At least one slide must show in previews" : undefined}>
              <Toggle label="Show in preview" sub="template cards" checked={s.preview !== false} onChange={(v) => { if (!v && previewOn <= 1) { toast.error("At least one slide must show in previews."); return; } onChange({ preview: v }); }} />
            </span>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <Field label="Headline placeholder"><input className={cn(inp, "font-semibold")} value={s.headline_placeholder} maxLength={120} onChange={(e) => onChange({ headline_placeholder: e.target.value })} /></Field>
            <Field label="Subline placeholder"><input className={inp} value={s.subline_placeholder} maxLength={160} onChange={(e) => onChange({ subline_placeholder: e.target.value })} /></Field>
            <PosGrid title="Headline position" note={s.headline_style?.position ? "this slide" : "template default"} value={s.headline_style?.position ?? textPosition} onChange={(v) => onChange({ headline_style: { ...(s.headline_style ?? {}), position: v as never } })} />
            <div className="grid gap-3 sm:grid-cols-2">
              {(["headline", "subline"] as const).map((k) => {
                const key = k === "headline" ? "headline_style" : "subline_style";
                const own = s[key]?.color;
                const set = (c: string | undefined) => {
                  const { color: _c, ...rest } = (s[key] ?? {}) as Record<string, unknown>;
                  onChange({ [key]: c ? { ...rest, color: c } : rest } as Partial<DocSlide>);
                };
                return (
                  <Field key={k} label={`${k === "headline" ? "Headline" : "Subline"} color · ${own ? "this slide" : "template default"}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><ColorInput value={own ?? colors[k]} onChange={(v) => set(v)} /></div>
                      {own && <button type="button" onClick={() => set(undefined)} className="text-[12px] text-primary">Use default</button>}
                    </div>
                  </Field>
                );
              })}
            </div>
            <div className="space-y-2">
              <Toggle label="Keep subline under headline" sub="subline position" checked={s.subline_style?.keep_under_headline ?? true} onChange={(v) => onChange({ subline_style: { ...(s.subline_style ?? {}), keep_under_headline: v, ...(v ? {} : { position: s.subline_style?.position ?? "bottom-center" }) } })} />
              {(s.subline_style?.keep_under_headline ?? true) === false && (
                <PosGrid title="Subline position" note="this slide" value={s.subline_style?.position ?? "bottom-center"} onChange={(v) => onChange({ subline_style: { ...(s.subline_style ?? {}), keep_under_headline: false, position: v } })} />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-secondary-text">Sample photo <span className="font-normal">· previews only</span></span>
            <div className="flex min-h-[84px] items-center gap-3 rounded-sm border border-dashed border-placeholder-border p-2">
              {s.sample_photo ? (
                <div className="w-full space-y-2">
                  <PhotoCrop slide={s} format={format} onChange={onChange} />
                  <div className="flex items-center gap-3 text-[12px]">
                    <button type="button" className="text-link" onClick={() => file.current?.click()}>Replace</button>
                    <button type="button" className="text-destructive" onClick={() => onChange({ sample_photo: null, photo_focus: { x: 0.5, y: 0.5 }, photo_zoom: 1 })}>Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => file.current?.click()} className="flex w-full items-center justify-center gap-1.5 text-[13px] text-secondary-text">
                  <ImagePlus className="size-4" strokeWidth={1.7} /> {busy ? "Uploading…" : "Add sample photo"}
                </button>
              )}
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function PhotoCrop({ slide, format, onChange }: { slide: DocSlide; format: Format; onChange: (p: Partial<DocSlide>) => void }) {
  const [drag, setDrag] = useState<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const focus = slide.photo_focus ?? { x: 0.5, y: 0.5 };
  const zoom = slide.photo_zoom ?? 1;
  const doc = useMemo<TemplateDoc>(() => ({
    name: "Crop preview", slug: "", description: "", format, is_reusable: false, featured: false, thumbnail_url: null,
    style: { ...DEFAULT_CROP_STYLE }, slides: [{ ...slide, headline_placeholder: "", subline_placeholder: "", transition_in: "none", text_animation: "none", photo_motion: "none" }],
  }), [format, slide]);
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    onChange({ photo_focus: { x: Math.min(1, Math.max(0, drag.fx - (e.clientX - drag.x) / (r.width * zoom * 1.4))), y: Math.min(1, Math.max(0, drag.fy - (e.clientY - drag.y) / (r.height * zoom * 1.4))) } });
  };
  return (
    <div className="space-y-2">
      <div
        className="relative mx-auto cursor-move touch-none overflow-hidden rounded-sm ring-1 ring-border"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y }); }}
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <TemplateCanvas doc={doc} format={format} time={0.2} width={format === "9:16" ? 104 : format === "1:1" ? 144 : 180} className="block" />
        <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] font-medium text-background drop-shadow">Drag to position</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-secondary-text">Zoom</span>
        <input className="min-w-0 flex-1 accent-[var(--primary)]" type="range" min={100} max={300} value={Math.round(zoom * 100)} aria-label="Sample photo zoom" onChange={(e) => onChange({ photo_zoom: Number(e.target.value) / 100 })} />
        <span className="nums w-9 text-right text-[11px]">{zoom.toFixed(1)}×</span>
        <IconBtn label="Reset crop" onClick={() => onChange({ photo_focus: { x: 0.5, y: 0.5 }, photo_zoom: 1 })}><RotateCcw className="size-3.5" strokeWidth={1.7} /></IconBtn>
      </div>
    </div>
  );
}

const DEFAULT_CROP_STYLE: TemplateDoc["style"] = {
  background_color: "#1D1D1F", headline: { font: null, weight: 700, size_px: 96, color: "#FFFFFF" },
  subline: { font: null, size_px: 44, color: "#FFFFFF" }, text_position: "center", logo_position: "top-right",
  logo_path: null, logo_size_pct: 16, logo_opacity: "solid", logo_show_on: "all", logo_version: "auto",
};

function LogoEditor({ style, onChange, upload }: { style: TemplateDoc["style"]; onChange: (p: Partial<TemplateDoc["style"]>) => void; upload: (f: File) => Promise<string> }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try { onChange({ logo_path: await upload(f) }); } catch (e) { toast.error(e instanceof Error ? e.message : "Logo upload failed"); } finally { setBusy(false); }
  };
  const size = style.logo_size_pct ?? 16;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-[12px] font-medium text-secondary-text">Template logo <span className="font-normal">· customers can replace it</span></p>
      <div className="mt-2 grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="flex min-h-[84px] items-center justify-center rounded-sm border border-dashed border-placeholder-border p-3">
          {style.logo_path ? <MediaImage path={style.logo_path} alt="Template logo" className="max-h-14 max-w-[140px] object-contain" /> : <span className="text-[12px] text-secondary-text">No logo</span>}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="header" disabled={busy} onClick={() => file.current?.click()}><ImagePlus className="size-4" strokeWidth={1.7} />{style.logo_path ? "Replace logo" : "Add logo"}</Button>
            {style.logo_path && <Button variant="ghost" size="header" onClick={() => onChange({ logo_path: null })}><X className="size-4" strokeWidth={1.7} />Remove</Button>}
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 text-[12px] text-secondary-text">Size</span>
            <input type="range" min={5} max={100} value={size} aria-label="Template logo size" className="min-w-0 flex-1 accent-[var(--primary)]" onChange={(e) => onChange({ logo_size_pct: Number(e.target.value) })} />
            <span className="nums w-9 text-right text-[12px]">{size}%</span>
          </div>
          <Seg value={style.logo_opacity ?? "solid"} options={["solid", "soft"]} onChange={(v) => onChange({ logo_opacity: v })} small />
          <Field label="Show logo on">
            <div className="flex gap-0.5 rounded-lg bg-control-fill p-0.5" role="radiogroup">
              {([
                ["all", "All frames"],
                ["first_last", "First & last"],
                ["selected", "This frame"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={(style.logo_show_on ?? "all") === value} onClick={() => onChange({ logo_show_on: value })} className={cn("h-8 flex-1 rounded-md px-2 text-[12px] font-medium", (style.logo_show_on ?? "all") === value ? "bg-card font-semibold shadow-segment" : "text-secondary-text")}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-secondary-text">
              {(style.logo_show_on ?? "all") === "all" ? "All slides" : style.logo_show_on === "first_last" ? "First and last slides" : "Choose inside each slide"}
            </p>
          </Field>
        </div>
      </div>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex size-8 items-center justify-center rounded-lg text-icon hover:bg-control-fill disabled:opacity-30">
      {children}
    </button>
  );
}

function ThumbnailEditor({ doc, onChange, upload }: { doc: TemplateDoc; onChange: (p: string | null) => void; upload: (f: File) => Promise<string> }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { onChange(await fn()); } catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  };
  const generate = () =>
    run(async () => {
      const dataUrl = await renderThumbnail(doc, 0);
      return upload(await (await fetch(dataUrl)).blob().then((b) => new File([b], "thumb.jpg", { type: "image/jpeg" })));
    });
  return (
    <div className="flex flex-wrap items-center gap-5">
      <TemplateThumb row={{ format: doc.format, thumbnail_url: doc.thumbnail_url, style: doc.style }} size={96} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="header" disabled={busy} onClick={() => file.current?.click()}><ImagePlus className="size-4" strokeWidth={1.7} /> Upload image</Button>
          <Button variant="secondary" size="header" disabled={busy} onClick={() => void generate()}><Sparkles className="size-4" strokeWidth={1.7} /> Generate from preview</Button>
          {doc.thumbnail_url && <Button variant="ghost" size="header" onClick={() => onChange(null)}><X className="size-4" strokeWidth={1.7} /> Clear</Button>}
        </div>
        <p className="text-[12px] text-secondary-text">
          {busy ? "Working…" : doc.thumbnail_url ? "Custom thumbnail set. Save or publish to keep it." : "No thumbnail yet — the card shows the background color."}
        </p>
      </div>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void run(() => upload(f)); }} />
    </div>
  );
}

function PublishDialog({ open, onOpenChange, row, doc, busy, onPublish }: {
  open: boolean; onOpenChange: (o: boolean) => void; row: any; doc: TemplateDoc; busy: boolean;
  onPublish: (o: { audience: string[]; newBadge: boolean; featured: boolean }) => void;
}) {
  const [limited, setLimited] = useState<boolean>(Boolean(row.audience?.length));
  const [plans, setPlans] = useState<string[]>(row.audience ?? []);
  const [newBadge, setNewBadge] = useState(!row.version);
  const [featured, setFeatured] = useState(doc.featured);
  useEffect(() => { if (open) setFeatured(doc.featured); }, [open, doc.featured]);
  const audience = limited ? plans : [];
  const version = (row.version ?? 0) + 1;
  const invalid = limited && !plans.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden p-0">
        <div className="flex gap-4 p-6 pb-4">
          <TemplateThumb row={{ format: doc.format, thumbnail_url: doc.thumbnail_url, style: doc.style }} size={44} />
          <div>
            <DialogTitle className="text-[19px] font-semibold">Publish {"\u201c"}{doc.name}{"\u201d"}</DialogTitle>
            <DialogDescription className="nums mt-1 text-[13px] text-secondary-text">
              Version {version} · {doc.format} · {doc.slides.length} slides · {docDuration(doc).toFixed(1)} s. {row.version ? "Ads people already made from earlier versions won't change." : "This is its first release."}
            </DialogDescription>
          </div>
        </div>
        <div className="px-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary-text">Who can use it</p>
          <button type="button" onClick={() => setLimited(false)} className={cn("mb-2 flex w-full gap-3 rounded-sm p-3 text-left shadow-card", !limited && "bg-primary/5 ring-2 ring-primary")}>
            <Radio on={!limited} />
            <span><b className="block text-[14px] font-semibold">All users</b><span className="text-[13px] text-secondary-text">Every account, including free trials. Shown under the {"\u201c"}Gravity Pants{"\u201d"} tab.</span></span>
          </button>
          <div className={cn("flex w-full gap-3 rounded-sm p-3 text-left shadow-card", limited && "bg-primary/5 ring-2 ring-primary")}>
            <button type="button" onClick={() => setLimited(true)} className="flex gap-3 text-left">
              <Radio on={limited} />
              <span><b className="block text-[14px] font-semibold">Only these plans</b><span className="text-[13px] text-secondary-text">Others see it with a lock and an upgrade prompt.</span></span>
            </button>
          </div>
          {limited && (
            <div className="mt-2 flex gap-5 pl-10">
              {PLAN_AUDIENCE.map(([k, l]) => (
                <label key={k} className="flex h-9 items-center gap-2 text-[13px]">
                  <Checkbox checked={plans.includes(k)} onCheckedChange={(v) => setPlans((p) => (v ? [...p, k] : p.filter((x) => x !== k)))} /> {l}
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-3 border-t border-border pb-5 pt-4">
            <label className="flex items-center justify-between gap-3">
              <span><span className="block text-[14px]">Show a {"\u201c"}New{"\u201d"} badge</span><span className="text-[12px] text-secondary-text">On the template card for 14 days</span></span>
              <Switch checked={newBadge} onCheckedChange={setNewBadge} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[14px]">Featured <span className="text-[12px] text-secondary-text">· pinned first in the picker</span></span>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-canvas px-6 py-4">
          <p className="flex min-w-0 flex-1 items-start gap-1.5 text-[12px] text-secondary-text">
            <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success-text" strokeWidth={1.7} />
            {limited ? `Customers on ${audienceLabel(plans) || "the chosen plans"} can use it; others see a lock.` : "Appears in the \u201cGravity Pants\u201d tab right away."}
          </p>
          <Button variant="secondary" size="header" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="header" disabled={busy || invalid} onClick={() => onPublish({ audience, newBadge, featured })}>
            {limited ? `Publish to ${plans.length} ${plans.length === 1 ? "plan" : "plans"}` : "Publish to all users"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Radio({ on }: { on: boolean }) {
  return <span className={cn("mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border", on ? "border-primary bg-primary" : "border-placeholder-border")}>{on && <span className="size-1.5 rounded-full bg-primary-foreground" />}</span>;
}

const ACTION_LABEL: Record<string, string> = {
  created: "Created", created_from_ad: "Created from an ad", saved_draft: "Saved draft", published: "Published", publish: "Published", unpublish: "Unpublished",
  archive: "Archived", restore: "Restored", feature: "Featured", unfeature: "Unfeatured", duplicated: "Created as a copy",
};

function HistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const get = useServerFn(adminTemplateHistory);
  const { data = [], isLoading } = useQuery({ queryKey: [...adminTemplatesKey, id, "history"], queryFn: () => get({ data: { id } }), enabled: open });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogTitle className="text-[17px] font-semibold">History</DialogTitle>
        <DialogDescription className="text-[13px] text-secondary-text">Every change staff made to this template.</DialogDescription>
        <ol className="max-h-[60vh] overflow-y-auto">
          {isLoading && <li className="py-3 text-[13px] text-secondary-text">Loading…</li>}
          {!isLoading && !data.length && <li className="py-3 text-[13px] text-secondary-text">No history yet.</li>}
          {data.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 text-[13px]">
              <span><b className="font-semibold">{ACTION_LABEL[e.action] ?? e.action}</b>{e.version ? <span className="nums text-secondary-text"> · v{e.version}</span> : null}<span className="block text-[12px] text-secondary-text">{e.who}</span></span>
              <span className="nums shrink-0 text-[12px] text-secondary-text">{new Date(e.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
