import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KitAgainButton } from "@/components/templates/KitAgain";
import { TRIAL, planById } from "@/lib/stillframe/plans-config";
import { getSignupChoice } from "@/lib/stillframe/signup-choice";
import { AlertCircle, Check, ChevronDown, ChevronLeft, Download, Film, Image as ImageIcon, LayoutGrid, Plus } from "lucide-react";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { effectiveKit, useBrandKit, useBrandKits } from "@/lib/stillframe/data";
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

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
  const { data: settings } = useBrandKit();
  const { data: kits } = useBrandKits();
  const kit = useMemo(() => (settings ? effectiveKit(settings, kits?.find((k) => k.id === project.brand_kit_id)) : settings), [settings, kits, project.brand_kit_id]);
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
  const { canUse, isSuccess: accessReady } = usePlanAccess();
  const [gif, setGif] = useState(true);
  useEffect(() => { if (accessReady && !canUse("gif")) setGif(false); }, [accessReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fps, setFps] = useState(30);
  const [gSize, setGSize] = useState<GifSize>("full");
  const [gColors, setGColors] = useState<GifColors>("best");
  const [gFps, setGFps] = useState(25);
  const [gLoop, setGLoop] = useState<"forever" | "once">("forever");
  const [gifSheet, setGifSheet] = useState(false);

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
  const [preferredPlan, setPreferredPlan] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      const choice = getSignupChoice(data.user.id);
      setPreferredPlan(choice ? `${planById(choice.plan).name} ${choice.billing}` : null);
    }
  }); }, []);
  const watermark = useRef(false);

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
      watermark.current = !!st.watermark;
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
    const ws = project.workspace_id;
    let totalBytes = 0;
    const track = (patch: Record<string, unknown>) =>
      void (supabase.from("exports" as never) as unknown as { upsert: (v: unknown, o: unknown) => Promise<unknown> }).upsert(
        { workspace_id: ws, project_id: project.id, stamp, ...patch },
        { onConflict: "workspace_id,stamp" },
      );
    track({
      status: "running",
      channels: [...new Set(files.map((f) => f.name.replace(/\.(mp4|gif)$/i, "")))],
      formats: [...new Set([...jobs.values()].map((j) => j.kind.toUpperCase()))],
    });
    let failure: string | null = null;
    const doneFiles: { name: string; blob: Blob }[] = [];
    const set = (k: string, s: Partial<JobState>) => setState((prev) => ({ ...prev, [k]: { ...prev[k]!, ...s } }));

    for (const [key, job] of jobs) {
      if (ac.signal.aborted) break;
      set(key, { status: "working" });
      const input: RenderInput = { project, frames, brand, images, format: job.format, width: job.width, height: job.height, watermark: watermark.current };
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
        for (const f of files.filter((f) => f.job === key)) doneFiles.push({ name: f.name, blob });
        totalBytes += blob.size * files.filter((f) => f.job === key).length;
        if (!counted) {
          // Count this export once, after the first file is finished; the server refuses if not allowed.
          const { data: ok } = await supabase.rpc("record_export", { _ws: ws, _project: project.id, _stamp: stamp });
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
            .upload(`${ws}/exports/${project.id}/${stamp}/${f.name}`, blob, { contentType: blob.type, upsert: true })
            .then(({ error }) => !error && setHistoryVersion((v) => v + 1));
        }
      } catch (e) {
        if (e instanceof ExportCancelled || ac.signal.aborted) set(key, { status: "cancelled" });
        else {
          console.error(e);
          failure = e instanceof Error ? e.message : String(e);
          set(key, { status: "error", note: job.kind === "mp4" ? "Something went wrong making this video. Try again, or try on a computer." : "Something went wrong making this file. Try again, or pick a smaller GIF size." });
        }
      }
    }
    track({ status: failure ? "failed" : counted ? "done" : "cancelled", error: failure, total_bytes: totalBytes });
    // A single finished file downloads straight away — no extra click needed.
    if (!ac.signal.aborted && doneFiles.length === 1 && files.length === 1) saveBlob(doneFiles[0]!.blob, doneFiles[0]!.name);
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
    <div className="flex min-h-dvh flex-col bg-canvas">
      <ExportHeader id={project.id} name={project.name} templateId={project.template_id} />
      <main className="mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-1 gap-6 px-4 pb-40 pt-6 sm:px-8 lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-16 lg:pt-8">
        <section className="min-w-0">
          <h1 className="text-[30px] font-bold leading-tight lg:text-[22px] lg:tracking-[-0.02em]">Where will this ad play?</h1>
          <KitAgainButton adId={project.id} templateId={project.template_id} className="mt-3 lg:hidden" />
          <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-sm border bg-card lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:border-0 lg:bg-transparent">
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
                    <Link to="/app/ad/$id/edit" params={{ id: project.id }}>
                      Fix in editor
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="hidden lg:block"><PreviousExports projectId={project.id} version={historyVersion} /></div>
        </section>

        <aside className="space-y-5 lg:space-y-4">
          <div className="hidden rounded-sm bg-card p-5 shadow-card lg:block">
            <div className="text-[30px] font-bold leading-none tracking-[-0.02em] nums">
              {files.length} {files.length === 1 ? "file" : "files"}
            </div>
            <p className="mt-2 text-[13px] text-secondary-text nums">
              {videos} {videos === 1 ? "video" : "videos"} + {gifs} animated {gifs === 1 ? "GIF" : "GIFs"} · {formatSeconds(seconds)} seconds each
            </p>
            {exportStatus?.limit != null && (
              <p className="mt-2 text-[13px] font-medium nums">
                {Math.max(0, exportStatus.limit - (exportStatus.used ?? 0))} of {exportStatus.limit} left{exportStatus.trial ? " in your free trial" : " this month"}
              </p>
            )}
            {!!exportStatus?.extras && exportStatus.extras > 0 && (
              <p className="mt-1 text-[13px] text-secondary-text nums">
                Plus {exportStatus.extras} extra {exportStatus.extras === 1 ? "export" : "exports"} that never expire
              </p>
            )}
            {exportStatus?.trial && !exportStatus.watermark && (
              <p className="mt-1 text-[13px] font-medium text-primary">Your first reel is on us — no watermark.</p>
            )}
            {exportStatus?.watermark && (
              <p className="mt-1 text-[13px] text-secondary-text">
                This export will carry a small Gravity Pants mark.{" "}
                <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setPlanSheet("no_plan")}>
                  Remove the watermark — Simple, $35/month
                </button>
              </p>
            )}
          </div>

          <Group label="Save as">
            <div className="grid grid-cols-2 gap-2">
              <PickCard on={mp4} onClick={() => setMp4((v) => !v)} icon={<Film className="size-4" strokeWidth={1.7} />} title="Video MP4" sub="With motion" />
              <PickCard on={gif} onClick={() => (gif || canUse("gif") ? setGif((v) => !v) : openUpgrade("gif"))} icon={<ImageIcon className="size-4" strokeWidth={1.7} />} title="Animated GIF" sub="Plays anywhere, no sound" />
            </div>
          </Group>

          {mp4 && (
            <Group label="Video motion">
              <Seg value={fps} onChange={setFps} options={[{ v: 30, l: "Standard", s: "30 fps" }, { v: 60, l: "Smooth", s: "60 fps" }, { v: 24, l: "Film", s: "24 fps" }]} />
            </Group>
          )}

          {gif && (
            <Group label="GIF quality" className="hidden lg:block">
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

          <div className="hidden lg:block">{exportStatus && !exportStatus.allowed ? (
            <Button size="main" className="w-full" onClick={() => setPlanSheet(exportStatus.reason ?? "no_plan")}>
              Choose a Plan to Export
            </Button>
          ) : (
            <Button size="main" className="w-full" disabled={!files.length || blocked || !images || !fontsReady || running} onClick={() => void start()}>
              {!images || !fontsReady ? "Getting ready…" : `Export ${files.length} ${files.length === 1 ? "File" : "Files"}`}
            </Button>
          )}
          {blocked && <p className="text-center text-[12px] text-destructive">Add a photo to every frame to export.</p>}</div>
          {gif && <button type="button" className="flex h-14 w-full items-center justify-between rounded-sm bg-card px-4 text-left shadow-card lg:hidden" onClick={() => setGifSheet(true)}><span><span className="block text-[14px] font-semibold">GIF quality</span><span className="text-[12px] text-secondary-text">{gSize === "full" ? "Full size" : gSize === "half" ? "Half size" : "480 px wide"} · {gColors} · {gFps} fps · {gLoop}</span></span><ChevronDown className="size-5 -rotate-90 text-icon" strokeWidth={1.7} /></button>}
        </aside>
        <div className="lg:hidden"><PreviousExports projectId={project.id} version={historyVersion} /></div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-card px-4 pt-3 shadow-popover safe-bottom hairline-t lg:hidden">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3"><strong className="text-[22px] nums">{files.length} {files.length === 1 ? "file" : "files"}</strong><span className="truncate text-[13px] text-secondary-text nums">{videos} videos + {gifs} GIFs · {formatSeconds(seconds)} sec</span></div>
        {exportStatus && !exportStatus.allowed ? <Button size="main" className="mb-3 min-h-12 w-full text-[16px]" onClick={() => setPlanSheet(exportStatus.reason ?? "no_plan")}>Choose a Plan to Export</Button> : <Button size="main" className="mb-3 min-h-12 w-full text-[16px]" disabled={!files.length || blocked || !images || !fontsReady || running} onClick={() => void start()}><Download strokeWidth={1.7} />{!images || !fontsReady ? "Getting ready…" : `Export ${files.length} ${files.length === 1 ? "File" : "Files"}`}</Button>}
        {blocked && <p className="pb-2 text-center text-[12px] text-destructive">Add a photo to every frame to export.</p>}
      </div>

      <Drawer open={gifSheet} onOpenChange={setGifSheet} shouldScaleBackground={false}>
        <DrawerContent className="lg:hidden"><DrawerHeader className="grid grid-cols-[1fr_auto] items-center text-left"><DrawerTitle>GIF quality</DrawerTitle><button type="button" className="font-semibold text-link" onClick={() => setGifSheet(false)}>Done</button></DrawerHeader><div className="space-y-5 overflow-y-auto px-4 pb-6"><Sub label="Size"><Seg value={gSize} onChange={setGSize} options={[{ v: "full", l: "Full", s: "same as video" }, { v: "half", l: "Half" }, { v: "small", l: "Small", s: "480 px wide" }]} /></Sub><Sub label="Colors"><Seg value={gColors} onChange={setGColors} options={[{ v: "best", l: "Best", s: "smooth gradients" }, { v: "balanced", l: "Balanced" }, { v: "smallest", l: "Smallest file" }]} /></Sub><Sub label="Frame rate"><Seg value={gFps} onChange={setGFps} options={[{ v: 25, l: "Smooth", s: "25 fps" }, { v: 15, l: "Light", s: "15 fps" }, { v: 10, l: "Minimal", s: "10 fps" }]} /></Sub><Sub label="Loop"><Seg value={gLoop} onChange={setGLoop} options={[{ v: "forever", l: "Forever" }, { v: "once", l: "Once" }]} /></Sub><p className="text-[12px] text-secondary-text">Full-size GIFs are large files. Pick a smaller size for email.</p></div></DrawerContent>
      </Drawer>

      <Dialog open={!!planSheet} onOpenChange={(o) => !o && setPlanSheet(null)}>
        <DialogContent className="max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{planSheet === "limit_reached" ? (exportStatus?.trial ? `You've used your ${TRIAL.exports} trial exports` : "You've used this month's exports") : planSheet === "payment_problem" ? "There's a problem with your payment" : "Choose a plan"}</DialogTitle>
            <DialogDescription>
              {planSheet === "limit_reached"
                ? "Your monthly exports are used up. Buy a pack of 5, 10 or 20 extra exports on the Billing page — they never expire — or move up a plan."
                : planSheet === "payment_problem"
                  ? "We couldn't take your last payment. Update your card in Manage Billing to keep exporting."
                   : `Your ${TRIAL.exports} free trial exports are used. Your ads and brand kit are saved and you can keep editing — choose a plan to keep exporting without a watermark.${preferredPlan ? ` You selected ${preferredPlan} when you joined.` : ""}`}
            </DialogDescription>
          </DialogHeader>
          <PlanCards compact />
          <p className="text-center text-[14px] text-secondary-text">
            <Link to="/pricing" className="text-primary">Compare all plans</Link>
          </p>
        </DialogContent>
      </Dialog>

      <ProgressSheet open={open} onOpenChange={(v) => !running && setOpen(v)} files={files} state={state} running={running} onCancel={cancel} zipName={`${base}.zip`} />
    </div>
  );
}

/* ================================================================== header */

function ExportHeader({ id, name, templateId }: { id: string; name: string; templateId?: string | null | undefined }) {
  const done = (
    <span className="flex size-4 items-center justify-center rounded-full bg-toggle-on text-primary-foreground">
      <Check className="size-2.5" strokeWidth={2.5} />
    </span>
  );
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-card px-2 hairline-b safe-top lg:h-[60px] lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to Your Ads">
          <Link to="/app/ads">
            <LayoutGrid className="hidden lg:block" strokeWidth={1.7} /><ChevronLeft className="lg:hidden" strokeWidth={1.7} />
          </Link>
        </Button>
        <HelpMenu />
        <div className="min-w-0 px-1"><span className="block truncate text-[17px] font-semibold lg:hidden">Export</span><span className="hidden truncate text-[15px] font-semibold lg:block">{name}</span><span className="block truncate text-[13px] text-secondary-text lg:hidden">{name} · Step 3 of 3</span></div>
      </div>
      <nav className="hidden h-8 items-center rounded-lg bg-control-fill p-0.5 text-[13px] font-medium lg:flex" aria-label="Steps">
        <Link to="/app/ads" className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          {done} Photos
        </Link>
        <Link to="/app/ad/$id/edit" params={{ id }} className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          {done} Edit
        </Link>
        <span className="flex h-7 items-center gap-1.5 rounded-lg bg-card px-3 shadow-segment" aria-current="step">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground nums">3</span>
          Export
        </span>
      </nav>
      <div className="hidden justify-end gap-2 lg:flex">
        <KitAgainButton adId={id} templateId={templateId} />
        <Button asChild variant="plain" size="header">
          <Link to="/app/ad/$id/edit" params={{ id }}>
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
  return <canvas ref={ref} width={W} height={H} className="max-w-full rounded-[2px] bg-control-fill" style={{ width, height: H / 2 }} />;
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
      className={cn("relative grid min-h-[108px] grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3 px-4 text-left hairline-b last:border-b-0 lg:flex lg:min-h-0 lg:flex-col lg:rounded-sm lg:bg-card lg:p-3 lg:shadow-card", selected && "lg:ring-2 lg:ring-primary")}
    >
      <span className={cn("order-3 flex size-11 items-center justify-center justify-self-end rounded-full lg:absolute lg:right-2 lg:top-2 lg:size-5", selected ? "bg-primary text-primary-foreground" : "border-2 border-placeholder-border")}>
        {selected && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <div className="order-1 flex h-[72px] w-[52px] items-center justify-center lg:h-[128px] lg:w-auto">
        <span className="lg:hidden"><MiniRender {...props} width={format === "9:16" ? 28 : format === "1:1" ? 42 : 48} /></span>
        <span className="hidden max-w-full lg:block"><MiniRender {...props} width={w} /></span>
      </div>
      <span className="order-2 min-w-0 lg:contents"><span className="block text-[16px] font-semibold leading-tight lg:mt-3 lg:text-[13px]">{name}</span><span className="mt-1 block text-[13px] text-secondary-text nums lg:mt-0.5 lg:text-[12px]">{format} · {size.width} × {size.height}</span></span>
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
      className={cn("relative grid min-h-[108px] cursor-pointer grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3 px-4 lg:flex lg:min-h-0 lg:flex-col lg:rounded-sm lg:border-2 lg:border-dashed lg:border-secondary-text/30 lg:p-3", value.on && "lg:border-solid lg:border-primary lg:bg-card")}
    >
      <span className={cn("order-3 flex size-11 items-center justify-center justify-self-end rounded-full lg:absolute lg:right-2 lg:top-2 lg:size-5", value.on ? "bg-primary text-primary-foreground" : "border-2 border-placeholder-border")}> 
        {value.on && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <div className="order-3 hidden h-[128px] items-center justify-center gap-1.5 text-[13px] text-secondary-text lg:flex">
        {input("w", "Width in pixels")} × {input("h", "Height in pixels")}
      </div>
      <span className="order-1 flex size-11 items-center justify-center text-icon lg:hidden"><Plus strokeWidth={1.7} /></span>
      <span className="order-2 min-w-0 lg:contents"><span className="block text-[16px] font-semibold lg:mt-3 lg:text-[13px]">Custom size</span><span className="mt-0.5 block text-[13px] text-secondary-text nums lg:text-[12px]">{value.on ? `${value.w} × ${value.h}` : "Any width × height"}</span></span>
    </div>
  );
}

function IssueThumb({ project, frames, index, images, brand }: { project: Project; frames: Frame[]; index: number; images: Map<string, HTMLImageElement> | null; brand: BrandStyle }) {
  return <MiniRender project={project} frames={frames} brand={brand} images={images} format="1:1" width={36} index={index} />;
}

function Group({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-sm bg-card p-4 shadow-card", className)}>
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
          className={cn("flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-1 text-[13px] font-medium leading-tight lg:min-h-8 lg:text-[12px]", value === o.v && "bg-card shadow-segment")}
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
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("relative min-h-16 rounded-sm bg-control-fill p-3 text-left", on && "bg-card ring-2 ring-primary")}>
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
  a.rel = "noopener";
  // Safari ignores clicks on anchors that aren't in the document.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Keep the URL alive well past the click — revoking too early cancels the save on some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
