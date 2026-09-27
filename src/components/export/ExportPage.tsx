import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Check, ChevronDown, ChevronLeft, Download, Film, Image as ImageIcon, LayoutGrid } from "lucide-react";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useBrandKit } from "@/lib/stillframe/data";
import { MEDIA_BUCKET } from "@/lib/stillframe/media";
import { registerCustomFonts } from "@/lib/stillframe/fonts";
import { CHANNELS, DEFAULT_CHANNEL, nearestFormat, slugify } from "@/lib/stillframe/channels";
import { formatSeconds, type Format, type Frame, type Project } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { loadImages } from "@/render/images";
import { ensureFonts, layoutFrame, mediaPaths, renderAt, restTime, videoDuration, type BrandStyle } from "@/render/renderFrame";
import { ExportCancelled, exportGif, exportMp4, isOutOfMemory, killFFmpeg, type GifColors, type RenderInput } from "@/render/exportMedia";
import { cn } from "@/lib/utils";
import { fetchExportStatus, useExportStatus, useRefreshBilling } from "@/lib/stillframe/billing";
import { PlanCards } from "@/components/billing/PlanCards";

type GifSize = "full" | "half" | "small";
type Target = { key: string; name: string; slug: string; format: Format; width: number; height: number };
type FileRow = { name: string; kind: "mp4" | "gif"; job: string };
type JobState = { progress: number; status: "waiting" | "working" | "done" | "error" | "cancelled"; blob?: Blob; note?: string };

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function gifSize(w: number, h: number, size: GifSize) {
  if (size === "half") return { width: even(w / 2), height: even(h / 2) };
  if (size === "small") return { width: 480, height: even((480 * h) / w) };
  return { width: w, height: h };
}

/* ================================================================== page */

export function ExportPage({ project, frames }: { project: Project; frames: Frame[] }) {
  const { data: kit } = useBrandKit();
  const brand = useMemo<BrandStyle>(
    () => ({ color: kit?.colors[0] ?? null, font: kit?.body_font ?? null, endCard: kit?.end_card ?? null }),
    [kit?.colors, kit?.body_font, kit?.end_card],
  );

  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (kit?.custom_fonts.length) await registerCustomFonts(kit.custom_fonts);
      const [map] = await Promise.all([loadImages(mediaPaths(project, frames)), ensureFonts(frames, brand)]);
      if (!alive) return;
      setImages(map);
      setFontsReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [project, frames, brand, kit?.custom_fonts]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(project.formats.map((f) => DEFAULT_CHANNEL[f])));
  const [custom, setCustom] = useState({ on: false, w: 1200, h: 628 });
  const [mp4, setMp4] = useState(true);
  const [gif, setGif] = useState(true);
  const [fps, setFps] = useState(30);
  const [gSize, setGSize] = useState<GifSize>("full");
  const [gColors, setGColors] = useState<GifColors>("best");
  const [gFps, setGFps] = useState(25);
  const [gLoop, setGLoop] = useState<"forever" | "once">("forever");

  const targets: Target[] = useMemo(() => {
    const list: Target[] = CHANNELS.filter((c) => selected.has(c.id)).map((c) => ({
      key: c.id,
      name: c.name,
      slug: c.slug,
      format: c.format,
      ...FORMAT_SIZE[c.format],
    }));
    if (custom.on) {
      const w = even(Math.min(3840, Math.max(64, custom.w || 0)));
      const h = even(Math.min(3840, Math.max(64, custom.h || 0)));
      list.push({ key: "custom", name: "Custom size", slug: "custom", format: nearestFormat(w, h), width: w, height: h });
    }
    return list;
  }, [selected, custom]);

  const base = slugify(project.name);
  const { files, jobs } = useMemo(() => {
    const files: FileRow[] = [];
    const jobs = new Map<string, { kind: "mp4" | "gif"; format: Format; width: number; height: number }>();
    for (const t of targets) {
      const ratio = t.key === "custom" ? `${t.width}x${t.height}` : t.format.replace(":", "x");
      if (mp4) {
        const job = `mp4:${t.width}x${t.height}:${t.format}`;
        jobs.set(job, { kind: "mp4", format: t.format, width: t.width, height: t.height });
        files.push({ name: `${base}_${t.slug}_${ratio}.mp4`, kind: "mp4", job });
      }
      if (gif) {
        const s = gifSize(t.width, t.height, gSize);
        const job = `gif:${s.width}x${s.height}:${t.format}`;
        jobs.set(job, { kind: "gif", format: t.format, ...s });
        files.push({ name: `${base}_${t.slug}_${ratio}.gif`, kind: "gif", job });
      }
    }
    return { files, jobs };
  }, [targets, mp4, gif, gSize, base]);

  const seconds = videoDuration(project, frames, brand);
  const videos = files.filter((f) => f.kind === "mp4").length;
  const gifs = files.length - videos;

  /* ---------------- safeguards */
  const issues = useMemo(() => {
    const out: { frame: number; text: string; blocking: boolean }[] = [];
    frames.forEach((f, i) => {
      if (!f.photo?.path) out.push({ frame: i, text: "This frame has no photo yet.", blocking: true });
    });
    if (!images || typeof OffscreenCanvas === "undefined") return out;
    const formats = [...new Set(targets.map((t) => t.format))];
    const { ctx } = { ctx: new OffscreenCanvas(8, 8).getContext("2d") as unknown as CanvasRenderingContext2D };
    for (const format of formats) {
      const { width: W, height: H } = FORMAT_SIZE[format];
      frames.forEach((_, i) => {
        const l = layoutFrame(ctx, project, frames, i, format, W, H, images);
        const s = l.safe;
        const outside = (b: { x: number; y: number; w: number; h: number } | null) =>
          b && (b.x < s.x - 2 || b.y < s.y - 2 || b.x + b.w > s.x + s.w + 2 || b.y + b.h > s.y + s.h + 2);
        const bad = [outside(l.headline) && "headline", outside(l.subline) && "subline", outside(l.logo) && "logo"].filter(Boolean);
        if (bad.length) out.push({ frame: i, text: `The ${bad.join(" and ")} runs past the safe edge in ${format}. Try a smaller size.`, blocking: false });
      });
    }
    return out;
  }, [frames, images, targets, project]);
  const blocked = issues.some((i) => i.blocking);

  /* ---------------- export run */
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, JobState>>({});
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const { data: exportStatus } = useExportStatus();
  const refreshBilling = useRefreshBilling();
  const [planSheet, setPlanSheet] = useState<string | null>(null);

  const start = async () => {
    if (!images || !files.length) return;
    // Server-side check right before starting.
    try {
      const st = await fetchExportStatus();
      if (!st.allowed) {
        void refreshBilling();
        setPlanSheet(st.reason ?? "no_plan");
        return;
      }
    } catch {
      toast.error("Couldn't check your plan. Please try again.");
      return;
    }
    const ac = new AbortController();
    abort.current = ac;
    setState(Object.fromEntries([...jobs.keys()].map((k) => [k, { progress: 0, status: "waiting" as const }])));
    setOpen(true);
    setRunning(true);
    // Keep the screen awake while exporting; ignore if unsupported or refused.
    type Lock = { release: () => Promise<void> };
    const holder: { lock: Lock | null } = { lock: null };
    const wake = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock;
        if (wl && document.visibilityState === "visible") holder.lock = await wl.request("screen");
      } catch {
        holder.lock = null;
      }
    };
    const onVis = () => void (document.visibilityState === "visible" && wake());
    document.addEventListener("visibilitychange", onVis);
    await wake();
    try {
      await runJobs(ac);
    } finally {
      document.removeEventListener("visibilitychange", onVis);
      void holder.lock?.release().catch(() => undefined);
    }
  };

  const runJobs = async (ac: AbortController) => {
    if (!images) return;
    await ensureFonts(frames, brand);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    let counted = false;
    const set = (k: string, s: Partial<JobState>) => setState((prev) => ({ ...prev, [k]: { ...prev[k]!, ...s } }));

    for (const [key, job] of jobs) {
      if (ac.signal.aborted) break;
      set(key, { status: "working" });
      const input: RenderInput = { project, frames, brand, images, format: job.format, width: job.width, height: job.height };
      const onProgress = (p: number) => set(key, { progress: p });
      try {
        let blob: Blob;
        let note: string | undefined;
        if (job.kind === "mp4") blob = await exportMp4(input, fps, ac.signal, onProgress);
        else {
          const opts = { fps: gFps, colors: gColors, loop: gLoop };
          try {
            blob = await exportGif(input, opts, ac.signal, onProgress);
          } catch (e) {
            if (!isOutOfMemory(e) || gSize !== "full") throw e;
            killFFmpeg();
            note = "This GIF was too big for your browser, so it was saved at half size.";
            set(key, { progress: 0, note });
            blob = await exportGif({ ...input, width: even(job.width / 2), height: even(job.height / 2) }, opts, ac.signal, onProgress);
          }
        }
        set(key, { status: "done", progress: 1, blob, ...(note ? { note } : {}) });
        if (!counted) {
          // Count this export once, after the first file is finished; the server refuses if not allowed.
          const { data: ok } = await supabase.rpc("record_export", { _ws: getWorkspaceId(), _project: project.id, _stamp: stamp });
          void refreshBilling();
          if (!ok) {
            ac.abort();
            set(key, { status: "error", note: "This file wasn't saved — your plan doesn't allow more exports right now." });
            setPlanSheet("limit_reached");
            break;
          }
          counted = true;
        }
        for (const f of files.filter((f) => f.job === key)) {
          void supabase.storage
            .from(MEDIA_BUCKET)
            .upload(`${getWorkspaceId()}/exports/${project.id}/${stamp}/${f.name}`, blob, { contentType: blob.type, upsert: true })
            .then(({ error }) => !error && setHistoryVersion((v) => v + 1));
        }
      } catch (e) {
        if (e instanceof ExportCancelled || ac.signal.aborted) set(key, { status: "cancelled" });
        else {
          console.error(e);
          set(key, { status: "error", note: "Something went wrong making this file. Try again, or pick a smaller GIF size." });
        }
      }
    }
    setState((prev) =>
      Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.status === "waiting" || v.status === "working" ? { ...v, status: "cancelled" } : v])),
    );
    setRunning(false);
  };

  const cancel = () => {
    abort.current?.abort();
    killFFmpeg();
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ExportHeader id={project.id} name={project.name} />
      <main className="mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-[1fr_360px] gap-8 px-8 pb-16 pt-8">
        <section className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">Where will this ad play?</h1>
          <div className="mt-5 grid grid-cols-4 gap-4">
            {CHANNELS.map((c) => (
              <ChannelCard
                key={c.id}
                name={c.name}
                format={c.format}
                size={FORMAT_SIZE[c.format]}
                selected={selected.has(c.id)}
                onClick={() => toggle(c.id)}
                project={project}
                frames={frames}
                brand={brand}
                images={images}
              />
            ))}
            <CustomCard value={custom} onChange={setCustom} />
          </div>

          {issues.length > 0 && (
            <div className="mt-6 space-y-2">
              {issues.map((iss, i) => (
                <div key={i} className="flex items-center gap-3 rounded-sm bg-card p-3 shadow-card">
                  <IssueThumb project={project} frames={frames} index={iss.frame} images={images} brand={brand} />
                  <AlertCircle className={cn("size-4 shrink-0", iss.blocking ? "text-destructive" : "text-secondary-text")} strokeWidth={1.7} />
                  <p className="flex-1 text-[13px]">
                    <span className="font-semibold nums">Frame {iss.frame + 1}</span> · {iss.text}
                  </p>
                  <Button asChild variant="plain" size="sm">
                    <Link to="/ad/$id/edit" params={{ id: project.id }}>
                      Fix in editor
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <PreviousExports projectId={project.id} version={historyVersion} />
        </section>

        <aside className="space-y-4">
          <div className="rounded-sm bg-card p-5 shadow-card">
            <div className="text-[30px] font-bold leading-none tracking-[-0.02em] nums">
              {files.length} {files.length === 1 ? "file" : "files"}
            </div>
            <p className="mt-2 text-[13px] text-secondary-text nums">
              {videos} {videos === 1 ? "video" : "videos"} + {gifs} animated {gifs === 1 ? "GIF" : "GIFs"} · {formatSeconds(seconds)} seconds each
            </p>
            {exportStatus?.limit != null && (
              <p className="mt-2 text-[13px] font-medium nums">
                {Math.max(0, exportStatus.limit - (exportStatus.used ?? 0))} of {exportStatus.limit} exports left this month
              </p>
            )}
          </div>

          <Group label="Save as">
            <div className="grid grid-cols-2 gap-2">
              <PickCard on={mp4} onClick={() => setMp4((v) => !v)} icon={<Film className="size-4" strokeWidth={1.7} />} title="Video" sub="MP4 · with motion" />
              <PickCard on={gif} onClick={() => setGif((v) => !v)} icon={<ImageIcon className="size-4" strokeWidth={1.7} />} title="Animated GIF" sub="Plays anywhere, no sound" />
            </div>
          </Group>

          {mp4 && (
            <Group label="Video motion">
              <Seg value={fps} onChange={setFps} options={[{ v: 30, l: "Standard", s: "30 fps" }, { v: 60, l: "Extra smooth", s: "60 fps" }, { v: 24, l: "Film look", s: "24 fps" }]} />
            </Group>
          )}

          {gif && (
            <Group label="GIF quality">
              <div className="space-y-3">
                <Sub label="Size">
                  <Seg value={gSize} onChange={setGSize} options={[{ v: "full", l: "Full", s: "same as video" }, { v: "half", l: "Half" }, { v: "small", l: "Small", s: "480 px wide" }]} />
                </Sub>
                <Sub label="Colors">
                  <Seg value={gColors} onChange={setGColors} options={[{ v: "best", l: "Best", s: "smooth gradients" }, { v: "balanced", l: "Balanced" }, { v: "smallest", l: "Smallest file" }]} />
                </Sub>
                <Sub label="Frame rate">
                  <Seg value={gFps} onChange={setGFps} options={[{ v: 25, l: "Smooth", s: "25 fps" }, { v: 15, l: "Light", s: "15 fps" }, { v: 10, l: "Minimal", s: "10 fps" }]} />
                </Sub>
                <Sub label="Loop">
                  <Seg value={gLoop} onChange={setGLoop} options={[{ v: "forever", l: "Forever" }, { v: "once", l: "Once" }]} />
                </Sub>
                <p className="text-[12px] text-secondary-text">Full-size GIFs are large files. Pick a smaller size for email.</p>
              </div>
            </Group>
          )}

          {exportStatus && !exportStatus.allowed ? (
            <Button size="main" className="w-full" onClick={() => setPlanSheet(exportStatus.reason ?? "no_plan")}>
              Choose a Plan to Export
            </Button>
          ) : (
            <Button size="main" className="w-full" disabled={!files.length || blocked || !images || !fontsReady || running} onClick={() => void start()}>
              {!images || !fontsReady ? "Getting ready…" : `Export ${files.length} ${files.length === 1 ? "File" : "Files"}`}
            </Button>
          )}
          {blocked && <p className="text-center text-[12px] text-destructive">Add a photo to every frame to export.</p>}
        </aside>
      </main>

      <Dialog open={!!planSheet} onOpenChange={(o) => !o && setPlanSheet(null)}>
        <DialogContent className="max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{planSheet === "limit_reached" ? "You've used this month's exports" : planSheet === "payment_problem" ? "There's a problem with your payment" : "Pick a plan to export"}</DialogTitle>
            <DialogDescription>
              {planSheet === "limit_reached"
                ? "Simple includes 2 exports a month. Move to Business for unlimited exports."
                : planSheet === "payment_problem"
                  ? "We couldn't take your last payment. Update your card in Manage Billing to keep exporting."
                  : "Your free trial lets you build and preview. Pick a plan to export your videos and GIFs."}
            </DialogDescription>
          </DialogHeader>
          <PlanCards compact />
        </DialogContent>
      </Dialog>

      <ProgressSheet open={open} onOpenChange={(v) => !running && setOpen(v)} files={files} state={state} running={running} onCancel={cancel} zipName={`${base}.zip`} />
    </div>
  );
}

/* ================================================================== header */

function ExportHeader({ id, name }: { id: string; name: string }) {
  const done = (
    <span className="flex size-4 items-center justify-center rounded-full bg-toggle-on text-primary-foreground">
      <Check className="size-2.5" strokeWidth={2.5} />
    </span>
  );
  return (
    <header className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-card px-4 hairline-b">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to Your Ads">
          <Link to="/">
            <LayoutGrid strokeWidth={1.7} />
          </Link>
        </Button>
        <span className="truncate px-1 text-[15px] font-semibold">{name}</span>
      </div>
      <nav className="flex h-8 items-center rounded-lg bg-control-fill p-0.5 text-[13px] font-medium" aria-label="Steps">
        <Link to="/" className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          {done} Photos
        </Link>
        <Link to="/ad/$id/edit" params={{ id }} className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          {done} Edit
        </Link>
        <span className="flex h-7 items-center gap-1.5 rounded-lg bg-card px-3 shadow-segment" aria-current="step">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground nums">3</span>
          Export
        </span>
      </nav>
      <div className="flex justify-end">
        <Button asChild variant="plain" size="header">
          <Link to="/ad/$id/edit" params={{ id }}>
            <ChevronLeft strokeWidth={1.7} /> Back to Edit
          </Link>
        </Button>
      </div>
    </header>
  );
}

/* ================================================================== pieces */

function MiniRender({ project, frames, brand, images, format, width, index = 0 }: { project: Project; frames: Frame[]; brand: BrandStyle; images: Map<string, HTMLImageElement> | null; format: Format; width: number; index?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = FORMAT_SIZE[format];
  const W = Math.round(width * 2);
  const H = Math.round((W * s.height) / s.width);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !images) return;
    renderAt(ctx, project, frames, format, restTime(frames, index), { width: W, height: H, images, brand });
  }, [project, frames, brand, images, format, W, H, index]);
  return <canvas ref={ref} width={W} height={H} className="rounded-[2px] bg-control-fill" style={{ width, height: H / 2 }} />;
}

function ChannelCard(props: {
  name: string;
  format: Format;
  size: { width: number; height: number };
  selected: boolean;
  onClick: () => void;
  project: Project;
  frames: Frame[];
  brand: BrandStyle;
  images: Map<string, HTMLImageElement> | null;
}) {
  const { name, format, size, selected, onClick } = props;
  const w = format === "9:16" ? 68 : format === "1:1" ? 110 : 150;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn("relative flex flex-col rounded-sm bg-card p-3 text-left shadow-card", selected && "ring-2 ring-primary")}
    >
      <span className={cn("absolute right-2 top-2 flex size-5 items-center justify-center rounded-full", selected ? "bg-primary text-primary-foreground" : "border border-secondary-text/30")}>
        {selected && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <div className="flex h-[128px] items-center justify-center">
        <MiniRender {...props} width={w} />
      </div>
      <span className="mt-3 text-[13px] font-semibold leading-tight">{name}</span>
      <span className="mt-0.5 text-[12px] text-secondary-text nums">
        {format} · {size.width} × {size.height}
      </span>
    </button>
  );
}

function CustomCard({ value, onChange }: { value: { on: boolean; w: number; h: number }; onChange: (v: { on: boolean; w: number; h: number }) => void }) {
  const input = (k: "w" | "h", label: string) => (
    <input
      type="number"
      aria-label={label}
      min={64}
      max={3840}
      value={value[k] || ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange({ ...value, on: true, [k]: Number(e.target.value) })}
      className="h-8 w-[72px] rounded-sm border bg-card px-2 text-[13px] nums"
    />
  );
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={value.on}
      onClick={() => onChange({ ...value, on: !value.on })}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && onChange({ ...value, on: !value.on })}
      className={cn("relative flex cursor-pointer flex-col rounded-sm border-2 border-dashed border-secondary-text/30 p-3", value.on && "border-solid border-primary bg-card")}
    >
      <span className={cn("absolute right-2 top-2 flex size-5 items-center justify-center rounded-full", value.on ? "bg-primary text-primary-foreground" : "border border-secondary-text/30")}>
        {value.on && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <div className="flex h-[128px] items-center justify-center gap-1.5 text-[13px] text-secondary-text">
        {input("w", "Width in pixels")} × {input("h", "Height in pixels")}
      </div>
      <span className="mt-3 text-[13px] font-semibold">Custom size</span>
      <span className="mt-0.5 text-[12px] text-secondary-text nums">
        Uses {nearestFormat(value.w || 1, value.h || 1)} layout
      </span>
    </div>
  );
}

function IssueThumb({ project, frames, index, images, brand }: { project: Project; frames: Frame[]; index: number; images: Map<string, HTMLImageElement> | null; brand: BrandStyle }) {
  return <MiniRender project={project} frames={frames} brand={brand} images={images} format="1:1" width={36} index={index} />;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm bg-card p-4 shadow-card">
      <div className="mb-2.5 text-[12px] font-medium text-secondary-text">{label}</div>
      {children}
    </div>
  );
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] text-secondary-text">{label}</div>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; s?: string }[] }) {
  return (
    <div className="flex rounded-lg bg-control-fill p-0.5">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("flex min-h-8 flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-1 text-[12px] font-medium leading-tight", value === o.v && "bg-card shadow-segment")}
        >
          {o.l}
          {o.s && <span className="text-[10px] font-normal text-secondary-text nums">{o.s}</span>}
        </button>
      ))}
    </div>
  );
}

function PickCard({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("relative rounded-sm bg-control-fill p-3 text-left", on && "bg-card ring-2 ring-primary")}>
      <span className={cn("absolute right-2 top-2 flex size-4 items-center justify-center rounded-full", on ? "bg-primary text-primary-foreground" : "border border-secondary-text/30")}>
        {on && <Check className="size-2.5" strokeWidth={2.5} />}
      </span>
      {icon}
      <div className="mt-2 text-[13px] font-semibold">{title}</div>
      <div className="text-[11px] text-secondary-text">{sub}</div>
    </button>
  );
}

/* ================================================================== progress */

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function ProgressSheet({
  open,
  onOpenChange,
  files,
  state,
  running,
  onCancel,
  zipName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  files: FileRow[];
  state: Record<string, JobState>;
  running: boolean;
  onCancel: () => void;
  zipName: string;
}) {
  const done = files.filter((f) => state[f.job]?.blob);
  const [wasHidden, setWasHidden] = useState(false);
  useEffect(() => {
    if (!running) return setWasHidden(false);
    const onVis = () => document.visibilityState === "hidden" && setWasHidden(true);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);
  const zipAll = async () => {
    const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
    for (const f of done) entries[f.name] = [new Uint8Array(await state[f.job]!.blob!.arrayBuffer()), { level: 0 }];
    saveBlob(new Blob([zipSync(entries) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), zipName);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] rounded-sm">
        <DialogHeader>
          <DialogTitle>{running ? "Making your files…" : "Your files are ready"}</DialogTitle>
          <DialogDescription>{running ? "Keep this tab open until everything is done." : "Download them one by one or all together."}</DialogDescription>
        </DialogHeader>
        {running && wasHidden && (
          <div role="status" className="rounded-sm bg-control-fill px-3 py-2 text-[13px]">
            Keep this tab open until your files are ready
          </div>
        )}
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {files.map((f) => {
            const s = state[f.job];
            return (
              <div key={f.name} className="rounded-sm bg-control-fill p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-[4px] bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase">{f.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{f.name}</span>
                  {s?.blob ? (
                    <Button variant="plain" size="sm" onClick={() => saveBlob(s.blob!, f.name)}>
                      <Download strokeWidth={1.7} /> Download
                    </Button>
                  ) : (
                    <span className="text-[12px] text-secondary-text nums">
                      {s?.status === "cancelled" ? "Cancelled" : s?.status === "error" ? "Failed" : s?.status === "waiting" ? "Waiting" : `${Math.round((s?.progress ?? 0) * 100)}%`}
                    </span>
                  )}
                </div>
                {!s?.blob && s?.status !== "error" && s?.status !== "cancelled" && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-card">
                    <div className="h-full bg-primary" style={{ width: `${(s?.progress ?? 0) * 100}%` }} />
                  </div>
                )}
                {s?.note && <p className={cn("mt-1.5 text-[12px]", s.status === "error" ? "text-destructive" : "text-secondary-text")}>{s.note}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          {running ? (
            <Button variant="plain" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="plain" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {done.length > 1 && (
                <Button onClick={() => void zipAll()}>
                  <Download strokeWidth={1.7} /> Download All (.zip)
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== history */

type PastExport = { stamp: string; files: string[] };

function PreviousExports({ projectId, version }: { projectId: string; version: number }) {
  const [items, setItems] = useState<PastExport[]>([]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const root = `${getWorkspaceId()}/exports/${projectId}`;
      const { data: folders } = await supabase.storage.from(MEDIA_BUCKET).list(root, { limit: 50, sortBy: { column: "name", order: "desc" } });
      const out: PastExport[] = [];
      for (const f of folders ?? []) {
        if (f.id) continue; // files, not folders
        const { data: files } = await supabase.storage.from(MEDIA_BUCKET).list(`${root}/${f.name}`, { limit: 100 });
        const names = (files ?? []).filter((x) => x.id).map((x) => x.name);
        if (names.length) out.push({ stamp: f.name, files: names });
      }
      if (alive) setItems(out);
    })();
    return () => {
      alive = false;
    };
  }, [projectId, version]);

  if (!items.length) return null;
  const download = async (stamp: string, name: string) => {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(`${getWorkspaceId()}/exports/${projectId}/${stamp}/${name}`, 300, { download: name });
    if (error || !data) { toast.error("That file couldn't be downloaded. Try again."); return; }
    window.location.href = data.signedUrl;
  };
  const parse = (stamp: string) => new Date(stamp.replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/, "T$1:$2:$3.$4Z"));
  const when = (stamp: string) => {
    const d = parse(stamp);
    return isNaN(d.getTime()) ? stamp : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };
  const daysLeft = (stamp: string) => {
    const d = parse(stamp);
    if (isNaN(d.getTime())) return null;
    const left = Math.max(0, Math.ceil(30 - (Date.now() - d.getTime()) / 86_400_000));
    return left <= 1 ? "Deleted within a day" : `${left} days left`;
  };
  return (
    <Collapsible className="mt-8">
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-[13px] font-semibold">
        <ChevronDown className="size-4 transition-transform group-data-[state=closed]:-rotate-90" strokeWidth={1.7} />
        Previous exports
        <span className="font-normal text-secondary-text nums">({items.length})</span>
      </CollapsibleTrigger>
      <p className="mt-1 pl-[22px] text-[12px] text-secondary-text">Kept for 30 days</p>
      <CollapsibleContent className="mt-3 space-y-3">
        {items.map((it) => (
          <div key={it.stamp} className="rounded-sm bg-card p-3 shadow-card">
            <div className="mb-2 flex justify-between gap-2 text-[12px] text-secondary-text nums">
              <span>{when(it.stamp)}</span>
              <span>{daysLeft(it.stamp)}</span>
            </div>
            <ul className="space-y-1">
              {it.files.map((n) => (
                <li key={n} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate">{n}</span>
                  <Button variant="ghost" size="sm" onClick={() => void download(it.stamp, n)}>
                    <Download strokeWidth={1.7} /> Download
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
