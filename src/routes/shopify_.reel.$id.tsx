import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { getShopifyConfig } from "@/lib/shopify/config.functions";
import { shopifyFetch } from "@/lib/shopify/bridge";
import { ensureFonts, renderAt, videoDuration, type BrandStyle } from "@/render/renderFrame";
import { exportGif, exportMp4, type RenderInput } from "@/render/exportMedia";
import type { Format, ProjectWithFrames } from "@/lib/stillframe/types";
import { sizeOf } from "@/lib/stillframe/main-size";
import { applyReelStyle, SHOPIFY_SIZES, type StyleChange } from "@/lib/shopify/reel-build";
import { ReelStylePanel } from "@/components/shopify/ReelStylePanel";
import { Button } from "@/components/ui/button";
import { PlanBar, UpgradeButton, useShopPlan } from "@/components/shopify/ShopPlan";

type TemplateLite = { id: string; name: string; thumbnail_url: string | null };
type ReelResponse = { project: ProjectWithFrames; urls: Record<string, string>; templates: TemplateLite[]; notice?: string | null; maxSlides?: number };
type ProductPhotos = { id: string; title: string; images: string[] }[];
const BRAND: BrandStyle = {};

export const Route = createFileRoute("/shopify_/reel/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    shop: typeof s["shop"] === "string" ? (s["shop"] as string) : undefined,
    host: typeof s["host"] === "string" ? (s["host"] as string) : undefined,
    note: typeof s["note"] === "string" ? (s["note"] as string) : undefined,
  }),
  loader: () => getShopifyConfig(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Your reel · Gravity Pants for Shopify" },
      { name: "description", content: "Preview, edit and export the reel made from your Shopify products." },
      { property: "og:title", content: "Your reel · Gravity Pants for Shopify" },
      { property: "og:description", content: "Preview, edit and export the reel made from your Shopify products." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "shopify-api-key", content: loaderData?.apiKey ?? "" },
    ],
    scripts: [{ src: "https://cdn.shopify.com/shopifycloud/app-bridge.js" }],
  }),
  component: ShopifyReel,
});

function loadImages(urls: Record<string, string>) {
  return Promise.all(
    Object.entries(urls).map(
      ([path, url]) =>
        new Promise<[string, HTMLImageElement | null]>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve([path, img]);
          img.onerror = () => resolve([path, null]);
          img.src = url;
        }),
    ),
  ).then((list) => new Map(list.filter((x): x is [string, HTMLImageElement] => !!x[1])));
}

function ShopifyReel() {
  const { id } = Route.useParams();
  const { shop, host, note } = Route.useSearch();
  const [reel, setReel] = useState<ReelResponse | null>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "words" | "template" | "photos" | "style">("none");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ProductPhotos | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const plan = useShopPlan();
  const currentReel = useRef<ReelResponse | null>(null);
  const styleQueue = useRef<Promise<void>>(Promise.resolve());
  const styleRevision = useRef(0);
  const pendingStyles = useRef<StyleChange[]>([]);
  const styleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback(async (r: ReelResponse) => {
    await ensureFonts(r.project.frames, BRAND).catch(() => undefined);
    setImages(await loadImages(r.urls));
    setReel(r);
    currentReel.current = r;
  }, []);

  function flushStyles() {
    if (styleTimer.current) clearTimeout(styleTimer.current);
    styleTimer.current = null;
    const changes = pendingStyles.current.splice(0);
    if (!changes.length) return styleQueue.current;
    const revision = styleRevision.current;
    styleQueue.current = styleQueue.current.then(async () => {
      for (const change of changes) {
        const result = await shopifyFetch<ReelResponse>("/api/public/shopify/reel", { action: "style", id, change });
        if (revision === styleRevision.current && change === changes[changes.length - 1]) await apply(result);
      }
    }).catch((e) => setError((e as Error).message));
    return styleQueue.current;
  }

  function updateStyle(change: StyleChange) {
    const current = currentReel.current;
    if (!current) return;
    const next = { ...current, project: applyReelStyle(current.project, change) };
    currentReel.current = next;
    setReel(next);
    void ensureFonts(next.project.frames, BRAND).catch((e) => setError((e as Error).message));
    styleRevision.current += 1;
    // Coalesce slider changes to one save while retaining distinct field edits.
    const last = pendingStyles.current[pendingStyles.current.length - 1];
    const same = last?.element === change.element && JSON.stringify(Object.keys(last.patch)) === JSON.stringify(Object.keys(change.patch))
      && (last.element === "logo" || (change.element !== "logo" && last.index === change.index && last.scope === change.scope));
    if (same) pendingStyles.current.pop();
    pendingStyles.current.push(change);
    if (styleTimer.current) clearTimeout(styleTimer.current);
    styleTimer.current = setTimeout(() => { void flushStyles(); }, 350);
  }

  useEffect(() => {
    shopifyFetch<ReelResponse>("/api/public/shopify/reel", { action: "get", id }).then(apply, (e) => setError((e as Error).message));
  }, [id, apply]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await flushStyles();
      const r = await shopifyFetch<ReelResponse>("/api/public/shopify/reel", { id, ...body });
      await apply(r);
      setInfo(r.notice ?? null);
      if (body["action"] === "words" || body["action"] === "template") setPanel("none");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: "photo" | "logo", file: File) {
    setBusy(true);
    setError(null);
    try {
      let f = file;
      if (kind === "logo" && file.type === "image/svg+xml") {
        const { sanitizeLogoFile } = await import("@/lib/stillframe/svg-safety");
        f = await sanitizeLogoFile(file);
      }
      const up = await shopifyFetch<{ path: string; uploadUrl: string }>("/api/public/shopify/reel", { action: "upload-url", id, kind, type: f.type });
      const put = await fetch(up.uploadUrl, { method: "PUT", headers: { "content-type": f.type }, body: f });
      if (!put.ok) throw new Error("Upload failed. Please try again.");
      setBusy(false);
      await send(kind === "logo" ? { action: "logo", path: up.path } : { action: "add", path: up.path });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function openPhotos() {
    setPanel("photos");
    setPhotos(null);
    try {
      setPhotos((await shopifyFetch<{ products: ProductPhotos }>("/api/public/shopify/reel", { action: "photos", id })).products);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const max = reel?.maxSlides ?? 10;
  const full = (reel?.project.frames.length ?? 0) >= max;
  const used = new Set(reel?.project.frames.map((f) => f.photo?.path) ?? []);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/shopify" search={{ shop, host }} className="text-sm text-primary hover:underline">Back</Link>
        <h1 className="mt-2 text-xl font-semibold">{reel?.project.name ?? "Your reel"}</h1>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        {info && <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{info}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-3"><PlanBar info={plan.info} returnTo={id} /></div>
        {!reel && !error && <p className="mt-6 text-muted-foreground">Loading your reel…</p>}
        {reel && images && (
          <div className="mt-6 grid gap-8 md:grid-cols-[320px_1fr]">
            <Player project={reel.project} images={images} slide={panel === "style" ? Math.min(selectedSlide, reel.project.frames.length - 1) : undefined} />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Size">
                {SHOPIFY_SIZES.map((f) => (
                  <button key={f} type="button" disabled={busy} aria-pressed={reel.project.primary_format === f} onClick={() => send({ action: "size", format: f })} className="rounded-lg border border-border px-3 py-1.5 text-sm tabular-nums aria-pressed:border-primary aria-pressed:text-primary disabled:opacity-60">{sizeOf(f).name} {f}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" data-cta="shopify-signoff-toggle" disabled={busy} checked={Boolean(reel.project.end_card?.enabled)} onChange={(e) => send({ action: "signoff", enabled: e.target.checked })} />
                  Sign-off slide
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5">
                  {reel.project.logo?.path && images.get(reel.project.logo.path) ? <img src={reel.urls[reel.project.logo.path]} alt="" className="h-5 w-auto" /> : null}
                  {reel.project.logo?.path ? "Replace logo" : "Add logo"}
                  <input type="file" data-cta="shopify-logo-upload" className="sr-only" accept="image/png,image/jpeg,image/svg+xml" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload("logo", f); }} />
                </label>
              </div>
              <div>
                <p className="text-sm text-muted-foreground tabular-nums">Photos {reel.project.frames.length} of {max}. Drag to reorder.</p>
                <ol className="mt-2 flex flex-wrap gap-2">
                  {reel.project.frames.map((f, i) => (
                    <li key={f.id} draggable={!busy} onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) void send({ action: "move", from: drag, to: i }); setDrag(null); }} className="relative h-20 w-16 cursor-grab overflow-hidden rounded border border-border">
                      <Button variant="ghost" data-cta="shopify-select-slide" aria-label={`Select slide ${i + 1}`} aria-pressed={selectedSlide === i} onClick={() => setSelectedSlide(i)} className="h-full w-full rounded-none p-0 aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-primary">{f.photo?.path && reel.urls[f.photo.path] && <img src={reel.urls[f.photo.path]} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />}</Button>
                      <button type="button" aria-label={`Remove photo ${i + 1}`} disabled={busy || reel.project.frames.length <= 1} onClick={() => send({ action: "remove", index: i })} className="absolute right-0.5 top-0.5 rounded-full bg-background/90 px-1.5 text-xs disabled:opacity-40">×</button>
                    </li>
                  ))}
                </ol>
                {full && <p className="mt-1 text-sm text-muted-foreground">A reel can have up to {max} photos. Remove one to add another.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" data-cta="shopify-edit-words" onClick={() => setPanel(panel === "words" ? "none" : "words")} className="rounded-lg border border-border px-4 py-2 text-sm">Edit words</button>
                <button type="button" data-cta="shopify-add-photos" disabled={full} onClick={() => (panel === "photos" ? setPanel("none") : void openPhotos())} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60">Add photos</button>
                <button type="button" data-cta="shopify-change-template" onClick={() => setPanel(panel === "template" ? "none" : "template")} className="rounded-lg border border-border px-4 py-2 text-sm">Change template</button>
                <Button variant="outline" data-cta="shopify-style" onClick={() => setPanel(panel === "style" ? "none" : "style")}>Style</Button>
              </div>
              {panel === "style" && <ReelStylePanel project={reel.project} index={Math.min(selectedSlide, reel.project.frames.length - 1)} onChange={updateStyle} onReset={() => send({ action: "reset-style" })} onVisible={(visible) => send({ action: "logo-visible", index: Math.min(selectedSlide, reel.project.frames.length - 1), visible })} />}
              {panel === "words" && <WordsPanel project={reel.project} busy={busy} onSave={(frames, signoff) => send({ action: "words", frames, signoff })} />}
              {panel === "template" && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {reel.templates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => send({ action: "template", templateId: t.id })}
                        aria-pressed={reel.project.template_id === t.id}
                        className="w-full rounded border border-border p-2 text-left text-sm aria-pressed:border-primary disabled:opacity-60"
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {panel === "photos" && (
                <div className="space-y-3 rounded border border-border p-4">
                  <label className="inline-flex cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm">
                    Upload a photo
                    <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={busy || full} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload("photo", f); }} />
                  </label>
                  {!photos && <p className="text-sm text-muted-foreground">Loading product photos…</p>}
                  {photos?.map((pr) => (
                    <div key={pr.id}>
                      <p className="text-sm font-medium">{pr.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {pr.images.map((u) => (
                          <button key={u} type="button" disabled={busy || full} onClick={() => send({ action: "add", productId: pr.id, url: u })} className="h-16 w-16 overflow-hidden rounded border border-border disabled:opacity-50">
                            <img src={u} alt={`Add photo of ${pr.title}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {photos && !photos.length && <p className="text-sm text-muted-foreground">No other product photos found.</p>}
                </div>
              )}
              <ExportPanel project={reel.project} images={images} beforeExport={flushStyles} watermarked={Boolean(plan.info?.status?.watermark) && plan.info?.plan.source === "shopify"} onDone={plan.refresh} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Player({ project, images, slide }: { project: ProjectWithFrames; images: Map<string, HTMLImageElement>; slide?: number | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const len = videoDuration(project, project.frames, BRAND);
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = slide === undefined ? ((now - start) / 1000) % Math.max(len, 0.1) : project.frames.slice(0, slide).reduce((sum, f) => sum + f.duration_sec, 0) + Math.min(project.frames[slide]?.duration_sec ?? 2, 1.5);
      renderAt(ctx, project, project.frames, project.primary_format, t, { width: canvas.width, height: canvas.height, images, brand: BRAND });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [project, images, slide]);
  const sz = sizeOf(project.primary_format as Format);
  return <canvas ref={ref} width={sz.width / 2} height={sz.height / 2} className="w-full rounded border border-border" aria-label="Reel preview" />;
}

function WordsPanel({ project, busy, onSave }: { project: ProjectWithFrames; busy: boolean; onSave: (f: { headline: string; subline: string }[], signoff: string) => void }) {
  const [frames, setFrames] = useState(project.frames.map((f) => ({ headline: f.headline?.text ?? "", subline: f.subline?.text ?? "" })));
  const [signoff, setSignoff] = useState(project.end_card?.cta_text ?? "");
  const input = "w-full rounded border border-input bg-background px-3 py-2 text-sm";
  return (
    <form className="space-y-3 rounded border border-border p-4" onSubmit={(e) => { e.preventDefault(); onSave(frames, signoff); }}>
      {frames.map((f, i) => (
        <fieldset key={i} className="space-y-1">
          <legend className="text-xs text-muted-foreground tabular-nums">Photo {i + 1}</legend>
          <input className={input} aria-label={`Headline ${i + 1}`} maxLength={120} value={f.headline} onChange={(e) => setFrames((a) => a.map((x, j) => (j === i ? { ...x, headline: e.target.value } : x)))} />
          <input className={input} aria-label={`Subtitle ${i + 1}`} maxLength={120} value={f.subline} onChange={(e) => setFrames((a) => a.map((x, j) => (j === i ? { ...x, subline: e.target.value } : x)))} />
        </fieldset>
      ))}
      <label className="block text-sm">
        Sign-off
        <input className={`${input} mt-1`} maxLength={60} value={signoff} onChange={(e) => setSignoff(e.target.value)} />
      </label>
      <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save words"}</button>
    </form>
  );
}

function ExportPanel({ project, images, beforeExport, watermarked, onDone }: { project: ProjectWithFrames; images: Map<string, HTMLImageElement>; beforeExport: () => Promise<void>; watermarked: boolean; onDone: () => void }) {
  const [lastWatermarked, setLastWatermarked] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function run(kind: "mp4" | "gif") {
    setMsg(null);
    setLink(null);
    setProgress(0);
    try {
      await beforeExport();
      const start = await shopifyFetch<{ path: string; uploadUrl: string; watermark: boolean }>("/api/public/shopify/export", { action: "start", id: project.id, kind });
      const sz = sizeOf(project.primary_format as Format);
      const size = kind === "mp4" ? { width: sz.width, height: sz.height } : { width: Math.round(sz.width / 2), height: Math.round(sz.height / 2) };
      const input: RenderInput = { project, frames: project.frames, brand: BRAND, images, format: project.primary_format, ...size, watermark: start.watermark };
      const ac = new AbortController();
      const blob = kind === "mp4"
        ? await exportMp4(input, 30, ac.signal, (p) => setProgress(p))
        : await exportGif(input, { fps: 15, colors: "best", loop: "forever" }, ac.signal, (p) => setProgress(p));
      const put = await fetch(start.uploadUrl, { method: "PUT", headers: { "content-type": blob.type || (kind === "mp4" ? "video/mp4" : "image/gif") }, body: blob });
      if (!put.ok) throw new Error("Upload failed. Please try again.");
      const { url } = await shopifyFetch<{ url: string }>("/api/public/shopify/export", { action: "download", path: start.path });
      setLink(url);
      window.open(url, "_blank");
      setLastWatermarked(start.watermark);
      setMsg(start.watermark ? "Done. Free trial exports carry a small watermark." : "Done.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setProgress(null);
      onDone();
    }
  }

  return (
    <div className="rounded border border-border p-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-cta="shopify-export-mp4" disabled={progress !== null} onClick={() => run("mp4")} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">Export MP4</button>
        <button type="button" data-cta="shopify-export-gif" disabled={progress !== null} onClick={() => run("gif")} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60">Export GIF</button>
      </div>
      {progress !== null && <p className="mt-2 text-sm text-muted-foreground tabular-nums" aria-live="polite">Exporting… {Math.round(progress * 100)}%</p>}
      {msg && <p className="mt-2 text-sm" aria-live="polite">{msg}</p>}
      {link && <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">Download file</a>}
      {(watermarked || lastWatermarked) && <div className="mt-2"><p className="mb-1 text-sm text-muted-foreground">This export carries a small watermark.</p><UpgradeButton returnTo={project.id} label="Remove watermark" cta="shopify-remove-watermark" variant="outline" /></div>}
    </div>
  );
}
