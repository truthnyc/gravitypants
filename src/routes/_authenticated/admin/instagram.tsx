import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/admin/AdminShell";
import { instagramFeed } from "@/lib/site/instagram-feed.functions";

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
    </div>
  );
}
