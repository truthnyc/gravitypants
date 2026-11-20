import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Download, Instagram, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/admin/AdminShell";
import { instagramFeed, type InstagramReel } from "@/lib/site/instagram-feed.functions";
import { startInstagramPost, checkInstagramPost } from "@/lib/site/instagram-publish.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/instagram")({
  head: () => ({ meta: [
    { title: "Instagram feed — Gravity Pants admin" },
    { name: "description", content: "Live reels with MP4s, captions and hashtags ready to post on the Gravity Pants Instagram." },
    { property: "og:title", content: "Instagram feed — Gravity Pants admin" },
    { property: "og:description", content: "Live reels with MP4s, captions and hashtags ready to post on Instagram." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: InstagramFeedPage,
});

const KEY = "gp-instagram-posted";

function InstagramFeedPage() {
  const load = useServerFn(instagramFeed);
  const q = useQuery({ queryKey: ["admin", "instagram-feed"], queryFn: () => load() });
  const [post, setPost] = useState<InstagramReel | null>(null);
  const [posted, setPosted] = useState<string[]>([]);
  useEffect(() => { try { setPosted(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ } }, []);
  const toggle = (id: string) => setPosted((p) => {
    const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
    localStorage.setItem(KEY, JSON.stringify(n));
    return n;
  });
  const copy = async (text: string, what: string) => { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); };
  const rows = q.data ?? [];
  return (
    <div>
      <PageTitle title="Instagram feed" sub="Live Aimanté reels, newest first. Download the MP4, copy the caption and hashtags, add photographer credits, then mark it posted." />
      {q.isLoading ? <p className="text-secondary-text">Loading…</p> : q.isError ? <Card><p className="text-secondary-text">Couldn't load reels. Try again.</p></Card> : rows.length === 0 ? <Card><p className="text-secondary-text">No live reels yet.</p></Card> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const done = posted.includes(r.id);
            const tags = r.hashtags.join(" ");
            return (
              <Card key={r.id}>
                <div className={`grid gap-4 md:grid-cols-[160px_minmax(0,1fr)] ${done ? "opacity-60" : ""}`}>
                  {r.video ? <video src={r.video} poster={r.poster ?? undefined} controls muted playsInline preload="metadata" className="w-full rounded bg-surface" /> : <div className="flex aspect-[4/5] items-center justify-center rounded bg-surface text-[13px] text-secondary-text">No video saved</div>}
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-[13px] text-secondary-text">{r.brand}</p>
                      <h2 className="text-[17px] font-semibold">{r.title}</h2>
                    </div>
                    <p className="whitespace-pre-line text-[14px]">{r.caption}</p>
                    <p className="text-[14px] text-primary">{tags}</p>
                    <div className="flex flex-wrap gap-2">
                      {r.video && <Button asChild size="sm" variant="outline"><a href={r.video} download target="_blank" rel="noreferrer"><Download strokeWidth={1.7} /> MP4</a></Button>}
                      <Button size="sm" onClick={() => setPost(r)}><Instagram strokeWidth={1.7} /> Instagram post</Button>
                      <Button size="sm" variant="outline" onClick={() => copy(`${r.caption}\n\n${tags}`, "Caption and hashtags")}><Copy strokeWidth={1.7} /> Copy all</Button>
                      <Button size="sm" variant="outline" onClick={() => copy(r.caption, "Caption")}><Copy strokeWidth={1.7} /> Caption</Button>
                      <Button size="sm" variant="outline" onClick={() => copy(tags, "Hashtags")}><Copy strokeWidth={1.7} /> Hashtags</Button>
                      <Button size="sm" variant={done ? "secondary" : "default"} onClick={() => toggle(r.id)}><Check strokeWidth={1.7} /> {done ? "Posted" : "Mark posted"}</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {post && <PostDialog reel={post} onClose={() => setPost(null)} onPosted={() => { if (!posted.includes(post.id)) toggle(post.id); setPost(null); }} copy={copy} />}
    </div>
  );
}

function PostDialog({ reel, onClose, onPosted, copy }: { reel: InstagramReel; onClose: () => void; onPosted: () => void; copy: (t: string, w: string) => Promise<void> }) {
  const [caption, setCaption] = useState(reel.caption);
  const [tags, setTags] = useState(reel.hashtags.join(" "));
  const [handles, setHandles] = useState("");
  const [keywords, setKeywords] = useState(reel.keywords.join(", "));
  const full = [caption, handles.trim() && `Credits: ${handles.trim()}`, tags].filter(Boolean).join("\n\n");
  const start = useServerFn(startInstagramPost);
  const check = useServerFn(checkInstagramPost);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const publish = async () => {
    setConfirm(false);
    setBusy("Uploading to Instagram…");
    try {
      const { containerId } = await start({ data: { reelId: reel.id, caption: full, coverAlt: keywords } });
      setBusy("Instagram is processing the video…");
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await check({ data: { reelId: reel.id, containerId } });
        if (s.state === "published") {
          toast.success("Posted to @gravity.pants", s.permalink ? { action: { label: "Open", onClick: () => window.open(s.permalink!, "_blank") } } : undefined);
          onPosted();
          return;
        }
        if (s.state === "failed") throw new Error(`Instagram couldn't process the video: ${s.message}`);
      }
      throw new Error("Instagram is still processing. Check @gravity.pants in a few minutes.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post to Instagram.");
    } finally { setBusy(null); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Instagram post — {reel.title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="space-y-2">
            {reel.poster ? <img src={reel.poster} alt={`Cover for ${reel.title}`} className="w-full rounded" /> : <div className="flex aspect-[4/5] items-center justify-center rounded bg-surface text-[13px] text-secondary-text">No cover</div>}
            <div className="flex flex-col gap-2">
              {reel.poster && <Button asChild size="sm" variant="outline"><a href={reel.poster} download target="_blank" rel="noreferrer"><Download strokeWidth={1.7} /> Cover</a></Button>}
              {reel.video && <Button asChild size="sm" variant="outline"><a href={reel.video} download target="_blank" rel="noreferrer"><Download strokeWidth={1.7} /> MP4</a></Button>}
            </div>
            {reel.moods.length > 0 && <p className="text-[13px] text-secondary-text">Moods: {reel.moods.join(", ")}</p>}
          </div>
          <div className="min-w-0 space-y-3">
            <label className="block text-[13px] font-medium">Caption<Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} className="mt-1" /></label>
            <label className="block text-[13px] font-medium">Hashtags<Textarea value={tags} onChange={(e) => setTags(e.target.value)} rows={3} className="mt-1" /></label>
            <label className="block text-[13px] font-medium">Handles to tag<Input value={handles} onChange={(e) => setHandles(e.target.value)} placeholder={`Verified @handles for ${reel.brand} and the photographer`} className="mt-1" /></label>
            <p className="text-[12px] text-secondary-text">Only add handles you've checked on Instagram.{reel.brandWebsite ? <> Brand site: <a className="text-primary underline" href={reel.brandWebsite} target="_blank" rel="noreferrer">{reel.brandWebsite}</a></> : null}</p>
            <label className="block text-[13px] font-medium">Keywords (cover alt text)<Input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-1" /></label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" disabled={!reel.video || !!busy || full.length > 2200} onClick={() => setConfirm(true)}><Send strokeWidth={1.7} /> {busy ?? "Post to Instagram"}</Button>
              <Button size="sm" variant="outline" onClick={() => copy(full, "Post text")}><Copy strokeWidth={1.7} /> Copy post text</Button>
              <Button size="sm" variant="outline" onClick={() => copy(keywords, "Keywords")}><Copy strokeWidth={1.7} /> Keywords</Button>
              <Button size="sm" variant="outline" onClick={onPosted}><Check strokeWidth={1.7} /> Mark posted</Button>
            </div>
          </div>
        </div>
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Post this reel to @gravity.pants?</AlertDialogTitle>
              <AlertDialogDescription>It goes live on Instagram right away with the caption, credits and hashtags shown. You can only post each reel once from here.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={publish}>Post now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
