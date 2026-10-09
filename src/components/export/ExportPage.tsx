import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KitAgainButton } from "@/components/templates/KitAgain";
import { TRIAL, planById } from "@/lib/stillframe/plans-config";
import { getSignupChoice } from "@/lib/stillframe/signup-choice";
import { AlertCircle, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Film, Image as ImageIcon } from "lucide-react";
import { AppButton, AppSectionLabel } from "@/components/app-ui";
import { SHOW_SHARE } from "@/lib/features";
import { ReelCard, StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import { useReelPlayer } from "@/components/editor/ReelPreview";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { effectiveKit, useBrandKit, useBrandKits, useTemplateName } from "@/lib/stillframe/data";
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

  const [selected, setSelected] = useState<Set<SizeId>>(() => new Set(DEFAULT_SIZES));
  const [customs, setCustoms] = useState<CustomRow[]>([]);
  const [customOn, setCustomOn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const loaded = useRef(false);
  // Remember the last size choice per user (stored as size ids; old platform ids are migrated).
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`gp.exportSizes.${userId}`);
      if (raw) {
        const v = JSON.parse(raw) as { sizes?: string[]; channels?: string[]; custom?: { w: number; h: number }[] };
        const sizes = migrateSizes([...(v.sizes ?? []), ...(v.channels ?? [])]);
        if (sizes.length || v.custom?.length) setSelected(new Set(sizes));
        if (v.custom?.length) { setCustoms(v.custom.map((c) => ({ id: rid(), w: String(c.w), h: String(c.h) }))); setCustomOn(true); }
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, [userId]);
  const [mp4, setMp4] = useState(true);
  const { canUse, isSuccess: accessReady } = usePlanAccess();
  const [gif, setGif] = useState(true);
  useEffect(() => { if (accessReady && !canUse("gif")) setGif(false); }, [accessReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fps, setFps] = useState(30);
  const [gSize, setGSize] = useState<GifSize>("full");
  const [gColors, setGColors] = useState<GifColors>("best");
  const [gFps, setGFps] = useState(25);
  const [gLoop, setGLoop] = useState<"forever" | "once">("forever");
  const templateName = useTemplateName(project.template_id);

  const validCustoms = useMemo(
    () => (customOn ? customs.filter((c) => !customError(num(c.w), num(c.h))).map((c) => ({ w: even(num(c.w)!), h: even(num(c.h)!) })) : [])
      .filter((c, i, a) => a.findIndex((x) => x.w === c.w && x.h === c.h) === i && !EXPORT_SIZES.some((s) => selected.has(s.id) && s.width === c.w && s.height === c.h)),
    [customs, customOn, selected],
  );
  useEffect(() => {
    if (!userId || !loaded.current) return;
    try { localStorage.setItem(`gp.exportSizes.${userId}`, JSON.stringify({ sizes: [...selected], custom: validCustoms })); } catch { /* ignore */ }
  }, [userId, selected, validCustoms]);

  const targets: Target[] = useMemo(() => {
    const list: Target[] = EXPORT_SIZES.filter((s) => selected.has(s.id)).map((s) => ({
      key: s.id, name: s.name, ratio: s.ratio, format: s.layout, width: s.width, height: s.height,
    }));
    for (const c of validCustoms) list.push({ key: `c${c.w}x${c.h}`, name: `${c.w}×${c.h}`, ratio: ratioLabel(c.w, c.h), format: nearestFormat(c.w, c.h), width: c.w, height: c.h, custom: true });
    return list;
  }, [selected, validCustoms]);

  const base = slugify(project.name);
  const { files, jobs } = useMemo(() => {
    const files: FileRow[] = [];
    const jobs = new Map<string, { kind: "mp4" | "gif"; format: Format; width: number; height: number }>();
    for (const t of targets) {
      if (mp4) {
        const job = `mp4:${t.width}x${t.height}:${t.format}`;
        jobs.set(job, { kind: "mp4", format: t.format, width: t.width, height: t.height });
        files.push({ name: exportFileName(base, t.width, t.height, "mp4"), kind: "mp4", job, width: t.width, height: t.height });
      }
      if (gif) {
        const s = gifSize(t.width, t.height, gSize);
        const job = `gif:${s.width}x${s.height}:${t.format}`;
        jobs.set(job, { kind: "gif", format: t.format, ...s });
        files.push({ name: exportFileName(base, t.width, t.height, "gif"), kind: "gif", job, width: s.width, height: s.height });
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

  const player = useReelPlayer({ project, frames });
  const doneCount = files.filter((f) => state[f.job]?.blob).length;
  const ready = open && !running && doneCount > 0;
  const overall = files.length ? files.reduce((n, f) => n + (state[f.job]?.progress ?? 0), 0) / files.length : 0;
  const summaryLine = [videos ? `${videos} ${videos === 1 ? "video" : "videos"}` : null, gifs ? `${gifs} animated ${gifs === 1 ? "GIF" : "GIFs"}` : null].filter(Boolean).join(" + ");
  const exportButton = exportStatus && !exportStatus.allowed ? (
    <AppButton size="lg" onClick={() => setPlanSheet(exportStatus.reason ?? "no_plan")}>Choose a Plan to Export</AppButton>
  ) : (
    <AppButton size="lg" disabled={!files.length || blocked || !images || !fontsReady || running} onClick={() => void start()}>
      {!images || !fontsReady ? "Getting ready…" : running ? "Exporting…" : `Export ${files.length} ${files.length === 1 ? "File" : "Files"}`}
    </AppButton>
  );

  return (
    <StepShell
      adId={project.id}
      step="export"
      title={{ name: project.name, status: "saved" }}
      left={
        <ReelCard
          preview={player.preview}
          playing={player.playing}
          onTogglePlay={player.toggle}
          segments={player.segments}
          time={player.time}
          total={player.total}
          name={project.name}
          meta={[templateName, `${frames.length} ${frames.length === 1 ? "photo" : "photos"}`, `${formatSeconds(seconds)} sec`].filter(Boolean).join(" · ")}
          status="saved"
          formats={project.formats}
          format={player.format}
          onFormat={(f) => player.setFormat(f as Format)}
        />
      }
    >
      {ready ? (
        <>
          <StepTitle title="Your files are ready" lead="Download them one by one or all together. Files stay in Previous exports for 30 days." />
          <FileList files={files} state={state} />
          <div className="mt-4 flex flex-wrap gap-2">
            {doneCount > 1 && <AppButton onClick={() => void zipAll(files, state, `${base}.zip`)}><Download className="size-4" strokeWidth={1.7} /> Download all</AppButton>}
            <AppButton variant="ghost" onClick={() => setOpen(false)}>Export more sizes</AppButton>
          </div>
          {SHOW_SHARE && <div className="mt-6 flex flex-col gap-4 rounded-[18px] bg-ap-soft-blue p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <b className="mb-1 block text-[17px]">Share it to the Directory</b>
              <p className="text-[14px] leading-normal text-ap-body">Let people find this reel in Gravity Pants search and on your brand page. It's optional and takes a minute.</p>
            </div>
            <AppButton asChild size="lg"><Link to="/app/ad/$id/share" params={{ id: project.id }}>Next: Share <ChevronRight className="size-4" strokeWidth={1.7} /></Link></AppButton>
          </div>}
          <PreviousExports projectId={project.id} version={historyVersion} />
        </>
      ) : (
        <>
          <StepTitle title="Where will this ad play?" lead="Pick every place you'll post it. You'll get a file in the right size for each." />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CHANNELS.map((c) => (
              <ChannelCard key={c.id} name={c.name} format={c.format} size={FORMAT_SIZE[c.format]} selected={selected.has(c.id)} onClick={() => toggle(c.id)} project={project} frames={frames} brand={brand} images={images} />
            ))}
            <CustomCard value={custom} onChange={setCustom} />
          </div>

          {issues.length > 0 && (
            <div className="mt-5 space-y-2">
              {issues.map((iss, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[14px] border border-ap-hairline p-3">
                  <IssueThumb project={project} frames={frames} index={iss.frame} images={images} brand={brand} />
                  <AlertCircle className={cn("size-4 shrink-0", iss.blocking ? "text-destructive" : "text-ap-muted")} strokeWidth={1.7} />
                  <p className="flex-1 text-[13px]"><span className="font-semibold nums">Frame {iss.frame + 1}</span> · {iss.text}</p>
                  <AppButton asChild variant="ghost" size="sm"><Link to="/app/ad/$id/edit" params={{ id: project.id }}>Fix in editor</Link></AppButton>
                </div>
              ))}
            </div>
          )}

          <AppSectionLabel className="mt-7 mb-2.5">Save as</AppSectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <PickCard on={mp4} onClick={() => setMp4((v) => !v)} icon={<Film className="size-4" strokeWidth={1.7} />} title="Video MP4" sub="With motion" />
            <PickCard on={gif} onClick={() => (gif || canUse("gif") ? setGif((v) => !v) : openUpgrade("gif"))} icon={<ImageIcon className="size-4" strokeWidth={1.7} />} title="Animated GIF" sub="Plays anywhere, no sound" />
          </div>

          {mp4 && (
            <>
              <div className="mt-5 mb-2 text-[13px] font-semibold">Video motion</div>
              <Seg value={fps} onChange={setFps} options={[{ v: 30, l: "Standard", s: "30 fps" }, { v: 60, l: "Smooth", s: "60 fps" }, { v: 24, l: "Film", s: "24 fps" }]} />
            </>
          )}

          {gif && (
            <div className="mt-6 border-t border-ap-hairline pt-5">
              <AppSectionLabel className="mb-3">GIF quality</AppSectionLabel>
              <div className="ap-gif-grid grid gap-4 sm:grid-cols-2">
                <Sub label="Size"><Seg value={gSize} onChange={setGSize} options={[{ v: "full", l: "Full", s: "same as video" }, { v: "half", l: "Half" }, { v: "small", l: "Small", s: "480 px" }]} /></Sub>
                <Sub label="Colors"><Seg value={gColors} onChange={setGColors} options={[{ v: "best", l: "Best" }, { v: "balanced", l: "Balanced" }, { v: "smallest", l: "Smallest" }]} /></Sub>
                <Sub label="Frame rate"><Seg value={gFps} onChange={setGFps} options={[{ v: 25, l: "Smooth", s: "25 fps" }, { v: 15, l: "Light", s: "15 fps" }, { v: 10, l: "Minimal", s: "10 fps" }]} /></Sub>
                <Sub label="Loop"><Seg value={gLoop} onChange={setGLoop} options={[{ v: "forever", l: "Forever" }, { v: "once", l: "Once" }]} /></Sub>
              </div>
              <p className="mt-3 text-[12px] text-ap-muted">Full-size GIFs are large files. Pick a smaller size for email.</p>
            </div>
          )}

          <div className="mt-6 rounded-[14px] bg-ap-panel p-4 text-[14px]">
            <p className="nums"><b>{files.length} {files.length === 1 ? "file" : "files"}</b>{summaryLine && ` · ${summaryLine}`} · {formatSeconds(seconds)} seconds each</p>
            <p className="mt-1 text-[13px] text-ap-muted nums">
              {[
                exportStatus?.limit != null ? `${Math.max(0, exportStatus.limit - (exportStatus.used ?? 0))} of ${exportStatus.limit} left${exportStatus.trial ? " in your free trial" : " this month"}` : null,
                exportStatus?.extras ? `Plus ${exportStatus.extras} extra ${exportStatus.extras === 1 ? "export" : "exports"} that never expire` : null,
              ].filter(Boolean).join(" · ")}
            </p>
            {exportStatus?.trial && !exportStatus.watermark && <p className="mt-1 text-[13px] font-medium text-ap-blue">Your first reel is on us — no watermark.</p>}
            {exportStatus?.watermark && (
              <p className="mt-1 text-[13px] text-ap-muted">
                This export will carry a small Gravity Pants mark.{" "}
                <button type="button" className="font-medium text-ap-blue hover:underline" onClick={() => setPlanSheet("no_plan")}>Remove the watermark — Simple, $35/month</button>
              </p>
            )}
            {running && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-ap-inner"><div className="h-full bg-ap-blue transition-[width]" style={{ width: `${overall * 100}%` }} /></div>
                <p className="mt-1.5 text-[12px] text-ap-muted">Making your files… Keep this tab open until everything is done.</p>
              </div>
            )}
          </div>
          {running && <div className="mt-3"><FileList files={files} state={state} /></div>}
          {open && !running && !doneCount && <p className="mt-3 text-[13px] text-destructive">No files were made. Try again, or pick a smaller GIF size.</p>}
          {blocked && <p className="mt-3 text-[12px] text-destructive">Add a photo to every frame to export.</p>}
          <PreviousExports projectId={project.id} version={historyVersion} />

          <StepActions>
            <KitAgainButton adId={project.id} templateId={project.template_id} />
            <span className="flex-1" />
            <AppButton asChild variant="ghost" size="lg"><Link to="/app/ad/$id/edit" params={{ id: project.id }}><ChevronLeft className="size-4" strokeWidth={1.7} /> Back to Edit</Link></AppButton>
            {running ? <AppButton variant="ghost" size="lg" onClick={cancel}>Cancel</AppButton> : null}
            {exportButton}
          </StepActions>
        </>
      )}

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
    </StepShell>
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
      className={cn("relative flex flex-col items-center rounded-[14px] border bg-ap-card p-3 text-center", selected ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}
    >
      <span className={cn("absolute top-2 right-2 grid size-5 place-items-center rounded-full", selected ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
        {selected && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <span className="mt-1 block px-4 text-[13px] font-semibold leading-tight">{name}</span>
      <span className="mt-0.5 block text-[11px] text-ap-muted nums">{format} · {size.width} × {size.height}</span>
      <div className="mt-2.5 flex h-[96px] w-full items-center justify-center">
        <MiniRender {...props} width={Math.round(w * 0.62)} />
      </div>
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
      className="h-9 w-[64px] rounded-lg border border-ap-hairline bg-ap-card px-2 text-center text-[13px] nums"
    />
  );
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={value.on}
      onClick={() => onChange({ ...value, on: !value.on })}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && onChange({ ...value, on: !value.on })}
      className={cn("relative flex cursor-pointer flex-col items-center rounded-[14px] border border-dashed bg-ap-card p-3 text-center", value.on ? "border-solid border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}
    >
      <span className={cn("absolute top-2 right-2 grid size-5 place-items-center rounded-full", value.on ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
        {value.on && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <span className="mt-1 block text-[13px] font-semibold">Custom size</span>
      <span className="mt-0.5 block text-[11px] text-ap-muted nums">Any width × height</span>
      <div className="mt-2.5 flex h-[96px] items-center justify-center gap-1.5 text-[13px] text-ap-muted">
        {input("w", "Width in pixels")} × {input("h", "Height in pixels")}
      </div>
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
      <div className="mb-1.5 text-[13px] font-semibold">{label}</div>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; s?: string }[] }) {
  return (
    <div className="flex gap-[3px] rounded-[10px] bg-ap-panel p-[3px]">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("flex min-h-10 flex-1 flex-col items-center justify-center rounded-[7px] px-1.5 py-1 text-[13px] leading-tight", value === o.v && "bg-ap-card font-semibold shadow-ap-soft")}
        >
          {o.l}
          {o.s && <span className="text-[11px] font-normal text-ap-muted nums">{o.s}</span>}
        </button>
      ))}
    </div>
  );
}

function PickCard({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("relative min-h-16 rounded-[14px] border bg-ap-card p-3.5 text-left", on ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}>
      <span className={cn("absolute top-3 right-3 grid size-5 place-items-center rounded-full", on ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
        {on && <Check className="size-2.5" strokeWidth={2.5} />}
      </span>
      {icon}
      <div className="mt-2 text-[14px] font-semibold">{title}</div>
      <div className="text-[12px] text-ap-muted">{sub}</div>
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

async function zipAll(files: FileRow[], state: Record<string, JobState>, zipName: string) {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of files) { const b = state[f.job]?.blob; if (b) entries[f.name] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }]; }
  saveBlob(new Blob([zipSync(entries) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), zipName);
}

function FileList({ files, state }: { files: FileRow[]; state: Record<string, JobState> }) {
  return (
    <div className="space-y-2">
      {files.map((f) => {
        const s = state[f.job];
        return (
          <div key={f.name} className="rounded-[14px] bg-ap-panel px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-ap-card px-1.5 py-0.5 text-[10px] font-semibold uppercase">{f.kind}</span>
              <span className="min-w-0 flex-1 truncate text-[14px]">{f.name}</span>
              {s?.blob ? (
                <button type="button" className="flex items-center gap-1 text-[14px] font-medium text-ap-blue" onClick={() => saveBlob(s.blob!, f.name)}>
                  <Download className="size-4" strokeWidth={1.7} /> Download
                </button>
              ) : (
                <span className="text-[12px] text-ap-muted nums">
                  {s?.status === "cancelled" ? "Cancelled" : s?.status === "error" ? "Failed" : s?.status === "waiting" ? "Waiting" : `${Math.round((s?.progress ?? 0) * 100)}%`}
                </span>
              )}
            </div>
            {!s?.blob && s?.status === "working" && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ap-inner"><div className="h-full bg-ap-blue" style={{ width: `${(s.progress ?? 0) * 100}%` }} /></div>
            )}
            {s?.note && <p className={cn("mt-1.5 text-[12px]", s.status === "error" ? "text-destructive" : "text-ap-muted")}>{s.note}</p>}
          </div>
        );
      })}
    </div>
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
    <Collapsible className="mt-6">
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-[13px] font-semibold">
        <ChevronDown className="size-4 transition-transform group-data-[state=closed]:-rotate-90" strokeWidth={1.7} />
        Previous exports
        <span className="font-normal text-secondary-text nums">({items.length})</span>
      </CollapsibleTrigger>
      <p className="mt-1 pl-[22px] text-[12px] text-secondary-text">Kept for 30 days</p>
      <CollapsibleContent className="mt-3 space-y-3">
        {items.map((it) => (
          <div key={it.stamp} className="rounded-[14px] bg-ap-panel p-3">
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
