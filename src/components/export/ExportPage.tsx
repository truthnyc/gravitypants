import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KitAgainButton } from "@/components/templates/KitAgain";
import { TRIAL, planById } from "@/lib/stillframe/plans-config";
import { getSignupChoice } from "@/lib/stillframe/signup-choice";
import { AlertCircle, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Film, Image as ImageIcon, Plus, X } from "lucide-react";
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
import { FontLoadError, registerCustomFonts } from "@/lib/stillframe/fonts";
import { nearestFormat, slugify } from "@/lib/stillframe/channels";
import { CUSTOM_MAX, CUSTOM_MIN, CUSTOM_PRESETS, DEFAULT_SIZES, EXPORT_SIZES, PLATFORMS, customError, exportFileName, migrateSizes, platformState, ratioLabel, sizeLabelForFile, togglePlatform, type PlatformId, type SizeId } from "@/lib/stillframe/export-sizes";
import { formatSeconds, type Format, type Frame, type Project } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { loadImages } from "@/render/images";
import { ensureFonts, layoutFrame, mediaPaths, renderAt, restTime, videoDuration, type BrandStyle } from "@/render/renderFrame";
import { ExportCancelled, exportGif, exportMp4, isOutOfMemory, killFFmpeg, type GifColors, type RenderInput } from "@/render/exportMedia";
import { cn } from "@/lib/utils";
import { fetchExportStatus, useExportStatus, useRefreshBilling } from "@/lib/stillframe/billing";
import { PlanCards } from "@/components/billing/PlanCards";

type GifSize = "full" | "half" | "small";
type Target = { key: string; name: string; ratio: string; format: Format; width: number; height: number; custom?: boolean };
type CustomRow = { id: string; w: string; h: string };
type FileRow = { name: string; kind: "mp4" | "gif"; job: string; width: number; height: number };
const num = (s: string) => (s.trim() === "" ? null : Number(s));
const rid = () => Math.random().toString(36).slice(2, 9);
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
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontRetry, setFontRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setFontsReady(false);
    setFontError(null);
    void (async () => {
      if (kit?.custom_fonts.length) await registerCustomFonts(kit.custom_fonts);
      const map = await loadImages(mediaPaths(project, frames));
      if (alive) setImages(map);
      await ensureFonts(frames, brand, true);
      if (!alive) return;
      setImages(map);
      setFontsReady(true);
    })().catch((error) => {
      if (alive) setFontError(error instanceof FontLoadError ? error.message : "Couldn't prepare this ad. Check your connection and retry.");
    });
    return () => {
      alive = false;
    };
  }, [project, frames, brand, kit?.custom_fonts, fontRetry]);

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
  const [gSize, setGSize] = useState<GifSize>("half");
  const [gColors, setGColors] = useState<GifColors>("best");
  const [gFps, setGFps] = useState(15);
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
  const [lastTrial, setLastTrial] = useState(false);
  const [preferredPlan, setPreferredPlan] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      setUserId(data.user.id);
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
    } catch (error) {
      const note = error instanceof FontLoadError ? error.message : "Couldn't prepare this export. Please try again.";
      setFontError(note);
      setState(Object.fromEntries([...jobs.keys()].map((k) => [k, { progress: 0, status: "error" as const, note }])));
      toast.error(note);
    } finally {
      setRunning(false);
      document.removeEventListener("visibilitychange", onVis);
      void holder.lock?.release().catch(() => undefined);
    }
  };

  const runJobs = async (ac: AbortController) => {
    if (!images) return;
    if (kit?.custom_fonts.length) await registerCustomFonts(kit.custom_fonts);
    await ensureFonts(frames, brand, true);
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
          if (exportStatus?.trial && !exportStatus.extras && (exportStatus.used ?? 0) + 1 >= (exportStatus.limit ?? 3)) {
            const seenKey = `sf-last-trial-seen:${ws}`;
            if (!localStorage.getItem(seenKey)) { localStorage.setItem(seenKey, "1"); setLastTrial(true); }
          }
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

  const [hoverP, setHoverP] = useState<PlatformId | null>(null);
  const [pulse, setPulse] = useState<Set<SizeId>>(new Set());
  const changeSizes = (next: Set<SizeId>) => {
    const added = new Set([...next].filter((s) => !selected.has(s)));
    setSelected(next);
    if (added.size) { setPulse(added); window.setTimeout(() => setPulse(new Set()), 700); }
  };
  const toggleSize = (id: SizeId) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    changeSizes(n);
  };

  const player = useReelPlayer({ project, frames });
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewT = targets.find((t) => t.key === previewKey) ?? targets[0] ?? null;
  const doneCount = files.filter((f) => state[f.job]?.blob).length;
  const ready = open && !running && doneCount > 0;
  const overall = files.length ? files.reduce((n, f) => n + (state[f.job]?.progress ?? 0), 0) / files.length : 0;
  void videos; void gifs;
  const exportButton = exportStatus && !exportStatus.allowed ? (
    <AppButton size="lg" onClick={() => setPlanSheet(exportStatus.reason ?? "no_plan")}>Choose a Plan to Export</AppButton>
  ) : (
    <AppButton size="lg" disabled={!files.length || blocked || !images || !fontsReady || running} onClick={() => void start()}>
      {fontError ? "Export unavailable" : !images || !fontsReady ? "Getting ready…" : running ? "Exporting…" : `Export ${files.length} ${files.length === 1 ? "File" : "Files"}`}
    </AppButton>
  );

  return (
    <StepShell
      adId={project.id}
      step="export"
      title={{ name: project.name, status: "saved" }}
      left={
        <ReelCard
          preview={previewT ? (
            <ExportStage target={previewT} time={player.time} project={project} frames={frames} brand={brand} images={images} />
          ) : (
            <p className="text-center text-[14px] text-ap-muted">Pick a size on the right to preview it.</p>
          )}
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
          sizesSlot={targets.length > 0 && (
            <>
              <AppSectionLabel className="mt-5 mb-2">Preview size</AppSectionLabel>
              <div role="tablist" aria-label="Preview size" className="flex flex-wrap gap-2">
                {targets.map((t) => {
                  const on = t.key === previewT?.key;
                  const r = t.width / t.height;
                  return (
                    <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => setPreviewKey(t.key)}
                      className={cn("inline-flex min-h-0 items-center gap-2 rounded-lg border bg-ap-card px-3 py-2 text-[13px] font-medium", on ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}>
                      <span aria-hidden className="rounded-[2px] border-[1.5px] border-current" style={{ width: r >= 1 ? 14 : 14 * r, height: r >= 1 ? 14 / r : 14 }} />
                      {t.name}
                      <span className="text-[11px] font-normal text-ap-muted nums">{t.ratio}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
          <StepTitle title="Where will this ad play?" lead="Pick the shapes you need. One file per shape works everywhere listed under it." />
          <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-ap-muted">Posting to</span>
            {PLATFORMS.map((p) => {
              const st = platformState(p.id, selected);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={st === "on" ? true : st === "mixed" ? "mixed" : false}
                  onMouseEnter={() => setHoverP(p.id)}
                  onMouseLeave={() => setHoverP(null)}
                  onFocus={() => setHoverP(p.id)}
                  onBlur={() => setHoverP(null)}
                  onClick={() => changeSizes(togglePlatform(p.id, selected))}
                  className={cn(
                    "inline-flex min-h-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                    st === "on" ? "bg-ap-ink text-ap-card" : st === "mixed" ? "bg-ap-soft-blue text-ap-blue" : "bg-ap-panel text-ap-ink hover:bg-ap-inner",
                  )}
                >
                  {st === "on" && <Check className="size-3" strokeWidth={2.5} />}
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2.5">
            {EXPORT_SIZES.map((s) => (
              <SizeCard key={s.id} size={s} selected={selected.has(s.id)} pulse={pulse.has(s.id)} hover={hoverP} onClick={() => toggleSize(s.id)} project={project} frames={frames} brand={brand} images={images} />
            ))}
            <CustomSizes on={customOn} setOn={setCustomOn} rows={customs} setRows={setCustoms} />
          </div>
          <p className="mt-3 text-[13px] text-ap-muted">Posting to Reels and TikTok? One vertical file covers both.</p>

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
            <PickCard on={mp4} onClick={() => setMp4((v) => !v)} icon={<Film className="size-4" strokeWidth={1.7} />} title="Video MP4" sub="With motion and sound" />
            <PickCard on={gif} onClick={() => (gif || canUse("gif") ? setGif((v) => !v) : openUpgrade("gif"))} icon={<ImageIcon className="size-4" strokeWidth={1.7} />} title="Animated GIF" sub="Plays anywhere, no sound" />
          </div>

          <Reveal show={mp4}>
            <div className="mt-5 mb-2 text-[13px] font-semibold" id="vm-label">Video motion</div>
            <Seg label="Video motion" value={fps} onChange={setFps} options={[{ v: 30, l: "Standard", s: "30 fps" }, { v: 60, l: "Smooth", s: "60 fps" }, { v: 24, l: "Film", s: "24 fps" }]} />
          </Reveal>

          <Reveal show={gif}>
            <div className="mt-6 border-t border-ap-hairline pt-5">
              <AppSectionLabel className="mb-3">GIF quality</AppSectionLabel>
              <div className="ap-gif-grid grid gap-4 sm:grid-cols-2">
                <Sub label="Size"><Seg label="GIF size" value={gSize} onChange={setGSize} options={[{ v: "full", l: "Full", s: "same as video" }, { v: "half", l: "Half" }, { v: "small", l: "Small", s: "480 px" }]} /></Sub>
                <Sub label="Colors"><Seg label="GIF colors" value={gColors} onChange={setGColors} options={[{ v: "best", l: "Best" }, { v: "balanced", l: "Balanced" }, { v: "smallest", l: "Smallest" }]} /></Sub>
                <Sub label="Frame rate"><Seg label="GIF frame rate" value={gFps} onChange={setGFps} options={[{ v: 25, l: "Smooth", s: "25 fps" }, { v: 15, l: "Light", s: "15 fps" }, { v: 10, l: "Minimal", s: "10 fps" }]} /></Sub>
                <Sub label="Loop"><Seg label="GIF loop" value={gLoop} onChange={setGLoop} options={[{ v: "forever", l: "Forever" }, { v: "once", l: "Once" }]} /></Sub>
              </div>
              <p className="mt-3 text-[12px] text-ap-muted">Full-size GIFs are large files. Pick a smaller size for email.</p>
            </div>
          </Reveal>

          <div className="mt-6 rounded-[14px] bg-ap-panel p-4 text-[14px]" aria-live="polite">
            {files.length ? (
              <p className="nums"><b>{files.length} {files.length === 1 ? "file" : "files"}</b> · {targets.map((t) => t.name).join(" + ")} · {[mp4 && "MP4", gif && "GIF"].filter(Boolean).join(" + ")} · {formatSeconds(seconds)} sec each</p>
            ) : (
              <p><b>Nothing to export yet</b> · {targets.length ? "pick a file type" : "pick at least one size"}</p>
            )}
            <p className="mt-1 text-[13px] text-ap-muted nums">
              {[
                exportStatus?.trial && exportStatus.limit != null ? `Trial · ${Math.max(0, exportStatus.limit - (exportStatus.used ?? 0))} of ${exportStatus.limit} exports left` : exportStatus?.limit != null ? `${Math.max(0, exportStatus.limit - (exportStatus.used ?? 0))} of ${exportStatus.limit} left${exportStatus.trial ? " in your free trial" : " this month"}` : null,
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
            {lastTrial && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[4px] border border-ap-hairline bg-ap-inner p-3" role="status">
                <p className="text-[14px]">That was your last trial export. Your reels and brand kit stay saved.</p>
                <Link to="/pricing" data-cta="trial-choose-plan" className="rounded-lg bg-ap-blue px-3 py-1.5 text-[14px] font-medium text-ap-card hover:bg-ap-blue-hover">Choose a plan</Link>
              </div>
            )}
            {running && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-ap-inner"><div className="h-full bg-ap-blue transition-[width]" style={{ width: `${overall * 100}%` }} /></div>
                <p className="mt-1.5 text-[12px] text-ap-muted">Making your files… Keep this tab open until everything is done.</p>
              </div>
            )}
            {files.length > 0 && !running && (
              <Collapsible className="mt-2">
                <CollapsibleTrigger className="text-[13px] font-medium text-ap-blue hover:underline">See the file list</CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {files.map((f) => (
                      <li key={f.name} className="flex justify-between gap-3 nums">
                        <span className="min-w-0 truncate">{f.name}</span>
                        <span className="shrink-0 text-ap-muted">~{estimateMb(f, seconds, fps, gFps, gColors)} MB</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          {running && <div className="mt-3"><FileList files={files} state={state} /></div>}
          {open && !running && !doneCount && <p className="mt-3 text-[13px] text-destructive">No files were made. Try again, or pick a smaller GIF size.</p>}
          {fontError && <div role="alert" className="mt-3 text-[13px] text-destructive"><p>{fontError}</p><Button variant="plain" className="mt-2" onClick={() => setFontRetry((v) => v + 1)}>Retry loading fonts</Button></div>}
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

function MiniRender({ project, frames, brand, images, format, width, index = 0, w: outW, h: outH }: { project: Project; frames: Frame[]; brand: BrandStyle; images: Map<string, HTMLImageElement> | null; format: Format; width: number; index?: number; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = outW && outH ? { width: outW, height: outH } : FORMAT_SIZE[format];
  const W = Math.round(width * 2);
  const H = Math.round((W * s.height) / s.width);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !images) return;
    renderAt(ctx, project, frames, format, restTime(frames, index), { width: W, height: H, images, brand });
  }, [project, frames, brand, images, format, W, H, index]);
  return <canvas ref={ref} width={W} height={H} className="max-w-full rounded-[2px] bg-control-fill" style={{ width, height: H / 2 }} />;
}

/** Left preview: the ad drawn by renderAt at the chosen size's shape. */
function ExportStage({ target, time, project, frames, brand, images }: { target: Target; time: number; project: Project; frames: Frame[]; brand: BrandStyle; images: Map<string, HTMLImageElement> | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scale = Math.min(1, 900 / Math.max(target.width, target.height));
  const W = Math.round(target.width * scale);
  const H = Math.round(target.height * scale);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !images) return;
    renderAt(ctx, project, frames, target.format, time, { width: W, height: H, images, brand });
  }, [project, frames, brand, images, target.format, W, H, time]);
  const wide = target.width >= target.height;
  return (
    <>
      <div className="flex h-full w-full items-center justify-center">
        <canvas
          ref={ref}
          width={W}
          height={H}
          className="ap-stage-shape rounded-[4px] bg-ap-inner shadow-ap-soft"
          style={{ aspectRatio: `${target.width} / ${target.height}`, width: wide ? "100%" : "auto", height: wide ? "auto" : "100%", maxWidth: "100%", maxHeight: "100%" }}
        />
      </div>
      <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ap-card px-2 py-0.5 text-[11px] text-ap-muted shadow-ap-soft nums">
        {target.width.toLocaleString()} × {target.height.toLocaleString()}
      </span>
    </>
  );
}

function SizeCard({ size, selected, pulse, hover, onClick, ...r }: {
  size: (typeof EXPORT_SIZES)[number];
  selected: boolean;
  pulse: boolean;
  hover: PlatformId | null;
  onClick: () => void;
  project: Project;
  frames: Frame[];
  brand: BrandStyle;
  images: Map<string, HTMLImageElement> | null;
}) {
  const ratio = size.width / size.height;
  const thumbW = ratio >= 1 ? 44 : Math.round(44 * ratio);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn("flex w-full items-center gap-3.5 rounded-[14px] border bg-ap-card p-3 text-left sm:p-3.5", selected ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline", pulse && "ap-pulse")}
    >
      <span className="grid size-16 shrink-0 place-items-center rounded-[10px] bg-ap-panel">
        <MiniRender {...r} format={size.layout} width={thumbW} w={size.width} h={size.height} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[16px] font-semibold">{size.name}</span>
          <span className="text-[15px] text-ap-muted nums">{size.ratio}</span>
          {size.badge && <span className="rounded-md bg-ap-soft-blue px-1.5 py-0.5 text-[11px] font-medium text-ap-blue">{size.badge}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ap-muted">
          <span className="nums">{size.width.toLocaleString()} × {size.height.toLocaleString()}</span>
          {" "}
          {size.uses.map((u, i) => (
            <span key={u.label}>
              <span className={cn("transition-colors", hover && u.platforms.includes(hover) && "font-medium text-ap-blue")}>{u.label}</span>
              {i < size.uses.length - 1 && " · "}
            </span>
          ))}
        </span>
      </span>
      <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full", selected ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
        {selected && <Check className="size-3" strokeWidth={2.5} />}
      </span>
    </button>
  );
}

function CustomSizes({ on, setOn, rows, setRows }: { on: boolean; setOn: (v: boolean) => void; rows: CustomRow[]; setRows: (r: CustomRow[]) => void }) {
  const toggle = () => {
    if (!on && !rows.length) setRows([{ id: rid(), w: "", h: "" }]);
    setOn(!on);
  };
  const update = (id: string, k: "w" | "h", v: string) => setRows(rows.map((r) => (r.id === id ? { ...r, [k]: v.replace(/[^0-9]/g, "") } : r)));
  const preset = (w: number, h: number) => {
    if (rows.some((r) => num(r.w) === w && num(r.h) === h)) return;
    const empty = rows.find((r) => !r.w && !r.h);
    setRows(empty ? rows.map((r) => (r === empty ? { ...r, w: String(w), h: String(h) } : r)) : [...rows, { id: rid(), w: String(w), h: String(h) }]);
  };
  return (
    <div className={cn("rounded-[14px] border bg-ap-card", on ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-dashed border-ap-hairline")}>
      <button type="button" role="checkbox" aria-checked={on} onClick={toggle} className="flex w-full items-center gap-3.5 p-3 text-left sm:p-3.5">
        <span className="grid size-16 shrink-0 place-items-center rounded-[10px] bg-ap-panel text-ap-muted"><Plus className="size-5" strokeWidth={1.7} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Custom size</span>
          <span className="mt-0.5 block text-[13px] text-ap-muted">Any width × height, for ad networks and banners</span>
        </span>
        <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full", on ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
          {on && <Check className="size-3" strokeWidth={2.5} />}
        </span>
      </button>
      <Reveal show={on}>
        <div className="space-y-3 px-3 pb-3.5 sm:px-3.5">
          {rows.map((r, i) => {
            const w = num(r.w), h = num(r.h);
            const err = r.w || r.h ? customError(w, h) : null;
            const eid = `cs-err-${r.id}`;
            return (
              <div key={r.id}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <label className="sr-only" htmlFor={`cw-${r.id}`}>Width in pixels, size {i + 1}</label>
                  <input id={`cw-${r.id}`} inputMode="numeric" placeholder="Width" value={r.w} onChange={(e) => update(r.id, "w", e.target.value)} aria-invalid={!!err} aria-describedby={err ? eid : undefined}
                    className="h-9 w-[84px] rounded-lg border border-ap-hairline bg-ap-card px-2 text-center nums" />
                  <span className="text-ap-muted">×</span>
                  <label className="sr-only" htmlFor={`ch-${r.id}`}>Height in pixels, size {i + 1}</label>
                  <input id={`ch-${r.id}`} inputMode="numeric" placeholder="Height" value={r.h} onChange={(e) => update(r.id, "h", e.target.value)} aria-invalid={!!err} aria-describedby={err ? eid : undefined}
                    className="h-9 w-[84px] rounded-lg border border-ap-hairline bg-ap-card px-2 text-center nums" />
                  <span className="text-ap-muted">px</span>
                  {!err && w && h && <span className="text-ap-muted nums">{ratioLabel(w, h)}</span>}
                  {rows.length > 1 && (
                    <button type="button" aria-label={`Remove size ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))} className="ml-auto grid size-8 min-h-0 min-w-0 place-items-center rounded-lg text-ap-muted hover:bg-ap-panel">
                      <X className="size-4" strokeWidth={1.7} />
                    </button>
                  )}
                </div>
                {err && <p id={eid} className="mt-1 text-[12px] text-destructive">{err}</p>}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] text-ap-muted">Quick add</span>
            {CUSTOM_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => preset(p.w, p.h)} className="min-h-0 rounded-full bg-ap-panel px-2.5 py-1 text-[12px] hover:bg-ap-inner">
                <span className="nums">{p.w}×{p.h}</span> <span className="text-ap-muted">{p.label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setRows([...rows, { id: rid(), w: "", h: "" }])} className="min-h-0 text-[13px] font-medium text-ap-blue hover:underline">+ Add another size</button>
          <p className="sr-only">Sizes from {CUSTOM_MIN} to {CUSTOM_MAX} px.</p>
        </div>
      </Reveal>
    </div>
  );
}

/** Smooth collapse; hidden content is inert so keyboard and screen readers skip it. Values are kept. */
function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className="ap-reveal grid" style={{ gridTemplateRows: show ? "1fr" : "0fr" }} inert={!show} aria-hidden={!show}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Rough file size estimate for the file list. */
function estimateMb(f: FileRow, seconds: number, fps: number, gFps: number, colors: GifColors) {
  const px = f.width * f.height * seconds;
  // MP4 size follows the encoder's bitrate (same for every shape); GIF factor calibrated against real downloads.
  const bytes = f.kind === "mp4"
    ? ((fps >= 60 ? 10_000_000 : 6_000_000) / 8) * seconds * 1.05
    : px * gFps * 0.1 * (colors === "best" ? 1 : colors === "balanced" ? 0.75 : 0.5);
  const mb = bytes / 1_000_000;
  return mb < 10 ? mb.toFixed(1) : Math.round(mb).toString();
}

function IssueThumb({ project, frames, index, images, brand }: { project: Project; frames: Frame[]; index: number; images: Map<string, HTMLImageElement> | null; brand: BrandStyle }) {
  return <MiniRender project={project} frames={frames} brand={brand} images={images} format="1:1" width={36} index={index} />;
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-semibold">{label}</div>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; s?: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-[3px] rounded-[10px] bg-ap-panel p-[3px]">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
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
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className={cn("relative min-h-16 rounded-[14px] border bg-ap-card p-3.5 text-left", on ? "border-ap-blue shadow-[0_0_0_1px_var(--ap-blue)]" : "border-ap-hairline")}>
      <span className={cn("absolute top-3 right-3 grid size-[22px] place-items-center rounded-full", on ? "bg-ap-blue text-ap-card" : "border-[1.5px] border-ap-hairline")}>
        {on && <Check className="size-3" strokeWidth={2.5} />}
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
                  <span className="truncate">{n}{sizeLabelForFile(n) && <span className="ml-2 text-secondary-text">{sizeLabelForFile(n)}</span>}</span>
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
