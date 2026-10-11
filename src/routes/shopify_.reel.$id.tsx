import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { getShopifyConfig } from "@/lib/shopify/config.functions";
import { shopifyFetch } from "@/lib/shopify/bridge";
import { ensureFonts, renderAt, videoDuration, type BrandStyle } from "@/render/renderFrame";
import { exportGif, exportMp4, type RenderInput } from "@/render/exportMedia";
import type { ProjectWithFrames } from "@/lib/stillframe/types";

type TemplateLite = { id: string; name: string; thumbnail_url: string | null };
type ReelResponse = { project: ProjectWithFrames; urls: Record<string, string>; templates: TemplateLite[] };
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
  const [panel, setPanel] = useState<"none" | "words" | "template">("none");
  const [busy, setBusy] = useState(false);

  const apply = useCallback(async (r: ReelResponse) => {
    await ensureFonts(r.project.frames, BRAND).catch(() => undefined);
    setImages(await loadImages(r.urls));
    setReel(r);
  }, []);

  useEffect(() => {
    shopifyFetch<ReelResponse>("/api/public/shopify/reel", { action: "get", id }).then(apply, (e) => setError((e as Error).message));
  }, [id, apply]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await apply(await shopifyFetch<ReelResponse>("/api/public/shopify/reel", { id, ...body }));
      setPanel("none");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/shopify" search={{ shop, host }} className="text-sm text-primary hover:underline">Back</Link>
        <h1 className="mt-2 text-xl font-semibold">{reel?.project.name ?? "Your reel"}</h1>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {!reel && !error && <p className="mt-6 text-muted-foreground">Loading your reel…</p>}
        {reel && images && (
          <div className="mt-6 grid gap-8 md:grid-cols-[320px_1fr]">
            <Player project={reel.project} images={images} />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" data-cta="shopify-edit-words" onClick={() => setPanel(panel === "words" ? "none" : "words")} className="rounded-lg border border-border px-4 py-2 text-sm">Edit words</button>
                <button type="button" data-cta="shopify-change-template" onClick={() => setPanel(panel === "template" ? "none" : "template")} className="rounded-lg border border-border px-4 py-2 text-sm">Change template</button>
              </div>
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
              <ExportPanel project={reel.project} images={images} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Player({ project, images }: { project: ProjectWithFrames; images: Map<string, HTMLImageElement> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const len = videoDuration(project, project.frames, BRAND);
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = ((now - start) / 1000) % Math.max(len, 0.1);
      renderAt(ctx, project, project.frames, "9:16", t, { width: canvas.width, height: canvas.height, images, brand: BRAND });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [project, images]);
  return <canvas ref={ref} width={540} height={960} className="w-full rounded border border-border" aria-label="Reel preview" />;
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

function ExportPanel({ project, images }: { project: ProjectWithFrames; images: Map<string, HTMLImageElement> }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function run(kind: "mp4" | "gif") {
    setMsg(null);
    setLink(null);
    setProgress(0);
    try {
      const start = await shopifyFetch<{ path: string; uploadUrl: string; watermark: boolean }>("/api/public/shopify/export", { action: "start", id: project.id, kind });
      const size = kind === "mp4" ? { width: 1080, height: 1920 } : { width: 540, height: 960 };
      const input: RenderInput = { project, frames: project.frames, brand: BRAND, images, format: "9:16", ...size, watermark: start.watermark };
      const ac = new AbortController();
      const blob = kind === "mp4"
        ? await exportMp4(input, 30, ac.signal, (p) => setProgress(p))
        : await exportGif(input, { fps: 15, colors: "best", loop: "forever" }, ac.signal, (p) => setProgress(p));
      const put = await fetch(start.uploadUrl, { method: "PUT", headers: { "content-type": blob.type || (kind === "mp4" ? "video/mp4" : "image/gif") }, body: blob });
      if (!put.ok) throw new Error("Upload failed. Please try again.");
      const { url } = await shopifyFetch<{ url: string }>("/api/public/shopify/export", { action: "download", path: start.path });
      setLink(url);
      window.open(url, "_blank");
      setMsg(start.watermark ? "Done. Free trial exports carry a small watermark." : "Done.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setProgress(null);
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
    </div>
  );
}
