import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, PageTitle, Pill } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { adminPublishedDetail, adminPublishedList, adminPublishedSave, adminPublishedUploadSlot, adminPublishedUseFile, type PublishedItem } from "@/lib/stillframe/admin-publish.functions";

export const Route = createFileRoute("/_authenticated/admin/published")({
  head: () => ({ meta: [
    { title: "Published reels — Gravity Pants admin" },
    { name: "description", content: "Every published Gravity Pants reel, with quick edits to words, photos and brand kits." },
    { property: "og:title", content: "Published reels — Gravity Pants admin" },
    { property: "og:description", content: "Every published Gravity Pants reel, with quick edits to words, photos and brand kits." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Published,
});

function Published() {
  const list = useServerFn(adminPublishedList);
  const q = useQuery({ queryKey: ["admin", "published"], queryFn: () => list() });
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const rows = (q.data ?? []).filter((r) => `${r.name} ${r.brand} ${r.title ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <PageTitle title="Published reels" sub="Live on Aimanté, in review, in the Showcase, or copied into Gravity Pants. Edit words, photos and brand kits here." />
      <Input aria-label="Search published reels" placeholder="Search by ad or brand" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />
      {q.isLoading ? <p className="text-secondary-text">Loading…</p> : rows.length === 0 ? <Card><p className="text-secondary-text">No published reels yet.</p></Card> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.projectId}>
              <div className="flex items-center gap-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-[4px] bg-control-fill">{r.thumb && <img src={r.thumb} alt="" className="size-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.title || r.name}</p>
                  <p className="truncate text-[13px] text-secondary-text">{r.brand} · {r.workspace}</p>
                </div>
                <Pill tone={r.status === "In review" ? "accent" : "good"}>{r.status}</Pill>
                <Button variant="outline" onClick={() => setOpen(open === r.projectId ? null : r.projectId)} aria-expanded={open === r.projectId}>{open === r.projectId ? "Close" : "Edit"}</Button>
              </div>
              {open === r.projectId && <Editor item={r} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ item }: { item: PublishedItem }) {
  const detail = useServerFn(adminPublishedDetail);
  const save = useServerFn(adminPublishedSave);
  const slot = useServerFn(adminPublishedUploadSlot);
  const applyFile = useServerFn(adminPublishedUseFile);
  const qc = useQueryClient();
  const key = ["admin", "published", item.projectId];
  const d = useQuery({ queryKey: key, queryFn: () => detail({ data: { projectId: item.projectId } }) });
  const [title, setTitle] = useState(item.title ?? "");
  const [desc, setDesc] = useState(item.description ?? "");
  const [words, setWords] = useState<Record<string, { headline: string | null; subline: string | null }>>({});
  const [kit, setKit] = useState<{ colors: string; headline_font: string; subline_font: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!d.data) return;
    setWords(Object.fromEntries(d.data.frames.map((f) => [f.id, { headline: f.headline, subline: f.subline }])));
    const k = d.data.kit;
    setKit(k ? { colors: k.colors.join(", "), headline_font: k.headline_font ?? "", subline_font: k.subline_font ?? "" } : null);
  }, [d.data]);

  const upload = async (target: "photo" | "logo" | "logo_dark", frameId: string | null, file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Choose an image under 10 MB.");
    const t = toast.loading("Uploading…");
    try {
      const s = await slot({ data: { projectId: item.projectId, target, frameId, fileName: file.name, contentType: file.type } });
      const { error } = await supabase.storage.from(s.bucket).uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
      if (error) throw error;
      await applyFile({ data: { projectId: item.projectId, target, frameId, fileName: file.name, path: s.path } });
      await qc.invalidateQueries({ queryKey: key });
      toast.success(target === "photo" ? "Photo replaced." : "Logo replaced.", { id: t });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed", { id: t }); }
  };

  const onSave = async () => {
    const colors = kit ? kit.colors.split(",").map((c) => c.trim()).filter(Boolean) : [];
    if (colors.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c))) return toast.error("Colours must look like #1A2B3C.");
    setBusy(true);
    try {
      await save({ data: {
        projectId: item.projectId, reelId: item.reelId, title: title || null, description: desc || null,
        frames: Object.entries(words).map(([id, w]) => ({ id, ...w })),
        kit: kit && d.data?.kit ? { id: d.data.kit.id, colors, headline_font: kit.headline_font || null, subline_font: kit.subline_font || null } : null,
      } });
      await qc.invalidateQueries({ queryKey: ["admin", "published"] });
      toast.success("Saved. Re-export the ad to update its video.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setBusy(false); }
  };

  if (d.isLoading || !d.data) return <p className="mt-4 text-secondary-text">Loading…</p>;
  const pick = (target: "photo" | "logo" | "logo_dark", frameId: string | null) => (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(target, frameId, f); };
  return (
    <div className="mt-5 space-y-6 border-t border-hairline pt-5">
      {item.reelId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-semibold text-secondary-text">Title<Input className="mt-1" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="text-[13px] font-semibold text-secondary-text sm:col-span-2">Description <span className="nums font-normal">({desc.length}/300)</span><Textarea className="mt-1" value={desc} maxLength={300} onChange={(e) => setDesc(e.target.value)} /></label>
        </div>
      )}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-secondary-text">Frames</p>
        <div className="space-y-3">
          {d.data.frames.map((f, i) => (
            <div key={f.id} className="flex gap-3">
              <label className="group relative size-24 shrink-0 cursor-pointer overflow-hidden rounded-[4px] bg-control-fill" title="Replace photo">
                {f.photo && <img src={f.photo} alt={`Frame ${i + 1} photo`} className="size-full object-cover" />}
                <span className="absolute inset-0 grid place-items-center bg-foreground/40 text-background opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"><ImageUp className="size-5" strokeWidth={1.7} /></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Replace frame ${i + 1} photo`} onChange={pick("photo", f.id)} />
              </label>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="nums text-[12px] text-secondary-text">Frame {i + 1}</p>
                {words[f.id]?.headline !== null && words[f.id] && <Input aria-label={`Frame ${i + 1} headline`} placeholder="Headline" value={words[f.id]!.headline ?? ""} onChange={(e) => setWords({ ...words, [f.id]: { ...words[f.id]!, headline: e.target.value } })} />}
                {words[f.id]?.subline !== null && words[f.id] && <Input aria-label={`Frame ${i + 1} subline`} placeholder="Subline" value={words[f.id]!.subline ?? ""} onChange={(e) => setWords({ ...words, [f.id]: { ...words[f.id]!, subline: e.target.value } })} />}
                {words[f.id]?.headline === null && words[f.id]?.subline === null && <p className="text-[13px] text-secondary-text">No words on this frame.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {d.data.kit && kit ? (
        <div>
          <p className="mb-1 text-[13px] font-semibold text-secondary-text">Brand kit · {d.data.kit.name}</p>
          {d.data.kit.sharedWith > 1 && <p className="nums mb-2 text-[13px] text-secondary-text">Used by {d.data.kit.sharedWith} ads; changes apply to all of them.</p>}
          <div className="flex flex-wrap gap-3">
            {(["logo", "logo_dark"] as const).map((t) => {
              const src = t === "logo" ? d.data.kit!.logo : d.data.kit!.logoDark;
              return (
                <label key={t} className={`grid h-16 w-32 cursor-pointer place-items-center rounded-[4px] border border-input p-2 ${t === "logo_dark" ? "bg-foreground" : "bg-card"}`} title="Replace logo">
                  {src ? <img src={src} alt={t === "logo" ? "Logo" : "Logo for dark photos"} className="max-h-full max-w-full object-contain" /> : <span className="text-[12px] text-secondary-text">Add logo</span>}
                  <input type="file" accept="image/png,image/svg+xml,image/webp" className="sr-only" aria-label={t === "logo" ? "Replace logo" : "Replace logo for dark photos"} onChange={pick(t, null)} />
                </label>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-[13px] font-semibold text-secondary-text">Colours<Input className="mt-1" value={kit.colors} onChange={(e) => setKit({ ...kit, colors: e.target.value })} placeholder="#0071E3, #FFFFFF" /></label>
            <label className="text-[13px] font-semibold text-secondary-text">Headline font<Input className="mt-1" value={kit.headline_font} onChange={(e) => setKit({ ...kit, headline_font: e.target.value })} /></label>
            <label className="text-[13px] font-semibold text-secondary-text">Subline font<Input className="mt-1" value={kit.subline_font} onChange={(e) => setKit({ ...kit, subline_font: e.target.value })} /></label>
          </div>
        </div>
      ) : <p className="text-[13px] text-secondary-text">This ad has no brand kit.</p>}
      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        <Link to="/app/ad/$id/edit" params={{ id: item.projectId }} className="text-[14px] text-primary">Open in studio</Link>
        <span className="text-[13px] text-secondary-text">Photos and logos save straight away. Re-export to update the video.</span>
      </div>
    </div>
  );
}
