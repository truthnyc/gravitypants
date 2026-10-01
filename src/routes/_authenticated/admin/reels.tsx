import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, PageTitle, Pill } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { deleteSiteReel, listAdminReels, moveSiteReel, saveSiteReel, type AdminReel } from "@/lib/stillframe/admin-reels.functions";
import { CATEGORY_LABEL, FORMAT_LABEL, categoryLabel, type ReelFormat } from "@/lib/site/reels";

export const Route = createFileRoute("/_authenticated/admin/reels")({
  head: () => ({ meta: [
    { title: "Website Reels — Gravity Pants" },
    { name: "description", content: "Swap the brand reels shown on the Gravity Pants website." },
    { property: "og:title", content: "Website Reels — Gravity Pants" },
    { property: "og:description", content: "Swap the brand reels shown on the Gravity Pants website." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Reels,
});

const DEFAULT_CATEGORIES = Object.keys(CATEGORY_LABEL);

type Probe = { format: ReelFormat; seconds: number; poster: Blob | null };

/** Reads the video's shape and length in the browser and grabs a still frame for the poster. */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    const done = (p: Probe) => { URL.revokeObjectURL(url); resolve(p); };
    v.onerror = () => done({ format: "916", seconds: 8, poster: null });
    v.onloadedmetadata = () => {
      const r = v.videoWidth / Math.max(1, v.videoHeight);
      const format: ReelFormat = r < 0.8 ? "916" : r > 1.3 ? "169" : "11";
      const seconds = Math.round(v.duration * 10) / 10 || 8;
      v.currentTime = Math.min(0.5, v.duration / 2);
      v.onseeked = () => {
        const c = document.createElement("canvas");
        const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
        c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done({ format, seconds, poster: b }), "image/webp", 0.8);
      };
    };
  });
}

async function upload(blob: Blob, ext: string, type: string) {
  const path = `reels/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-reels").upload(path, blob, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return `site-reels:${path}`;
}

type Draft = { id?: string; brand: string; title: string; href: string; category: string; published: boolean; photos: number };
const empty: Draft = { brand: "", title: "", href: "", category: "fashion", published: true, photos: 3 };

function ReelForm({ initial, categories, onDone, onCancel }: { initial: Draft; categories: string[]; onDone: () => void; onCancel?: () => void }) {
  const save = useServerFn(saveSiteReel);
  const [d, setD] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isNew = !initial.id;

  const submit = async () => {
    if (isNew && !file) { toast.error("Pick a reel file."); return; }
    let href = d.href.trim();
    if (href && !/^https?:\/\//.test(href)) href = `https://${href}`;
    setBusy(true);
    try {
      let files: { video_url?: string; poster_url?: string | null; format?: ReelFormat; seconds?: number } = {};
      if (file) {
        const probe = await probeVideo(file);
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const video_url = await upload(file, ext, file.type || "video/mp4");
        const poster_url = probe.poster ? await upload(probe.poster, "webp", "image/webp") : null;
        files = { video_url, poster_url, format: probe.format, seconds: probe.seconds };
      }
      const current = initial as Draft & { format?: ReelFormat; seconds?: number };
      await save({ data: {
        ...(d.id ? { id: d.id } : {}),
        brand: d.brand, title: d.title, href: href || null,
        category: d.category, photos: d.photos, published: d.published,
        format: files.format ?? current.format ?? "916",
        seconds: files.seconds ?? current.seconds ?? 8,
        ...(files.video_url ? { video_url: files.video_url, poster_url: files.poster_url ?? null } : {}),
      } });
      toast(isNew ? "Reel added to the website" : "Reel updated");
      setD(empty); setFile(null);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally { setBusy(false); }
  };

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="grid gap-1 text-[13px] text-secondary-text">Brand
        <Input required value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} placeholder="Purl Soho" className="h-11 bg-card text-[15px] text-foreground" />
      </label>
      <label className="grid gap-1 text-[13px] text-secondary-text">Reel title
        <Input required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Japanese Denim Cotton" className="h-11 bg-card text-[15px] text-foreground" />
      </label>
      <label className="grid gap-1 text-[13px] text-secondary-text">Brand link
        <Input value={d.href} onChange={(e) => setD({ ...d, href: e.target.value })} placeholder="https://brand.com" inputMode="url" className="h-11 bg-card text-[15px] text-foreground" />
      </label>
      <label className="grid gap-1 text-[13px] text-secondary-text">Category
        <Input required list="reel-categories" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} placeholder="fashion" className="h-11 bg-card text-[15px] text-foreground" />
        <datalist id="reel-categories">
          {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </datalist>
        <span>Pick an existing one or type a new category.</span>
      </label>
      <div className="grid gap-1 text-[13px] text-secondary-text sm:col-span-2">Reel file (MP4 or WebM)
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="plain" onClick={() => input.current?.click()}>
            <Upload className="size-4" strokeWidth={1.7} /> {file ? "Choose another file" : isNew ? "Choose file" : "Replace file"}
          </Button>
          <span className="min-w-0 break-all text-[14px] text-foreground">{file ? file.name : isNew ? "No file yet" : "Keeping the current file"}</span>
          <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <span>Size and length are read from the file, and a still frame is made for you.</span>
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <Switch checked={d.published} onCheckedChange={(v) => setD({ ...d, published: v })} /> Show on the website
      </label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && <Button type="button" variant="plain" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : isNew ? "Add reel" : "Save changes"}</Button>
      </div>
    </form>
  );
}

function Reels() {
  const list = useServerFn(listAdminReels);
  const del = useServerFn(deleteSiteReel);
  const move = useServerFn(moveSiteReel);
  const { data, refetch } = useQuery({ queryKey: ["admin", "reels"], queryFn: () => list() });
  const [editing, setEditing] = useState<string | null>(null);
  const reels = data ?? [];
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...reels.map((r) => r.category)])];

  const reorder = async (i: number, dir: -1 | 1) => {
    const ids = reels.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await move({ data: { ids } });
    void refetch();
  };
  const remove = async (r: AdminReel) => {
    if (!window.confirm(`Remove "${r.title}" from the website?`)) return;
    await del({ data: { id: r.id } });
    toast("Reel removed");
    void refetch();
  };

  return (
    <>
      <PageTitle title="Website Reels" sub="These reels show on the home page, Examples and Showcase, in this order." />
      <Card className="mb-6"><h2 className="mb-3 text-[17px] font-semibold">Add a reel</h2><ReelForm initial={empty} categories={categories} onDone={() => void refetch()} /></Card>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {reels.map((r, i) => (
            <li key={r.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-control-fill">
                  {r.posterView && <img src={r.posterView} alt="" className="max-h-full max-w-full object-contain" />}
                </div>
                <div className="min-w-0 flex-1 text-[14px]">
                  <div className="font-medium">{r.brand} · {r.title} {!r.published && <Pill>Hidden</Pill>}</div>
                  <div className="text-[13px] text-secondary-text nums">{FORMAT_LABEL[r.format as ReelFormat] ?? r.format} · {r.seconds} sec · {r.href ?? "No link"}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="plain" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => void reorder(i, -1)}><ArrowUp className="size-4" strokeWidth={1.7} /></Button>
                  <Button variant="plain" size="icon" aria-label="Move down" disabled={i === reels.length - 1} onClick={() => void reorder(i, 1)}><ArrowDown className="size-4" strokeWidth={1.7} /></Button>
                  <Button variant="plain" size="sm" onClick={() => setEditing(editing === r.id ? null : r.id)}>Edit</Button>
                  <Button variant="destructive-plain" size="sm" onClick={() => void remove(r)}>Remove</Button>
                </div>
              </div>
              {editing === r.id && (
                <div className="mt-4">
                  <ReelForm
                    categories={categories}
                    initial={{ id: r.id, brand: r.brand, title: r.title, href: r.href ?? "", category: r.category, published: r.published, photos: r.photos, ...({ format: r.format, seconds: r.seconds } as object) }}
                    onDone={() => { setEditing(null); void refetch(); }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}
            </li>
          ))}
          {reels.length === 0 && <li className="px-5 py-6 text-[14px] text-secondary-text">No reels yet.</li>}
        </ul>
      </Card>
    </>
  );
}
