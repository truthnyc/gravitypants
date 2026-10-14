import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { MEDIA_BUCKET } from "@/lib/stillframe/media";
import { deleteMyExport } from "@/lib/stillframe/account.functions";

export const Route = createFileRoute("/_authenticated/app/exports")({
  head: () => ({
    meta: [
      { title: "Previous Exports — Gravity Pants" },
      { name: "description", content: "Download the videos and GIFs you exported in the last 30 days." },
      { property: "og:title", content: "Previous Exports — Gravity Pants" },
      { property: "og:description", content: "Every finished export, kept for 30 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExportsPage,
});

type Item = { projectId: string; name: string; stamp: string; files: string[] };

const parse = (stamp: string) => new Date(stamp.replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/, "T$1:$2:$3.$4Z"));
const when = (stamp: string) => {
  const d = parse(stamp);
  return isNaN(d.getTime()) ? stamp : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const daysLeft = (stamp: string) => {
  const d = parse(stamp);
  if (isNaN(d.getTime())) return "";
  const left = Math.max(0, Math.ceil(30 - (Date.now() - d.getTime()) / 86_400_000));
  return left <= 1 ? "Deleted within a day" : `${left} days left`;
};

function ExportsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [liveAds, setLiveAds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ws = getWorkspaceId();
      const root = `${ws}/exports`;
      const { data: projects } = await supabase.storage.from(MEDIA_BUCKET).list(root, { limit: 500 });
      const ids = (projects ?? []).filter((p) => !p.id).map((p) => p.name);
      const names = new Map<string, string>();
      if (ids.length) {
        const { data } = await supabase.from("projects").select("id,name").in("id", ids);
        for (const p of (data ?? []) as { id: string; name: string }[]) names.set(p.id, p.name);
        const { data: reels } = await supabase.from("directory_reels").select("ad_id").in("ad_id", ids).eq("status", "live");
        if (alive) setLiveAds(new Set((reels ?? []).map((r: { ad_id: string }) => r.ad_id)));
      }
      const out: Item[] = [];
      await Promise.all(
        ids.map(async (pid) => {
          const { data: stamps } = await supabase.storage.from(MEDIA_BUCKET).list(`${root}/${pid}`, { limit: 100 });
          await Promise.all(
            (stamps ?? []).filter((s) => !s.id).map(async (s) => {
              const { data: files } = await supabase.storage.from(MEDIA_BUCKET).list(`${root}/${pid}/${s.name}`, { limit: 100 });
              const list = (files ?? []).filter((f) => f.id).map((f) => f.name);
              if (list.length) out.push({ projectId: pid, name: names.get(pid) ?? "Untitled ad", stamp: s.name, files: list });
            }),
          );
        }),
      );
      out.sort((a, b) => (a.stamp < b.stamp ? 1 : -1));
      if (alive) setItems(out);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const download = async (it: Item, file: string) => {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(`${getWorkspaceId()}/exports/${it.projectId}/${it.stamp}/${file}`, 300, { download: file });
    if (error || !data) {
      toast.error("That file couldn't be downloaded. Try again.");
      return;
    }
    window.location.href = data.signedUrl;
  };

  const remove = async (it: Item) => {
    const published = liveAds.has(it.projectId);
    const msg = published
      ? `Delete this export of "${it.name}"? The files are removed, but the export still counts toward your plan. This ad is live in the Directory — deleting the export won't unpublish it.`
      : `Delete this export of "${it.name}"? The files are removed, but the export still counts toward your plan.`;
    if (!window.confirm(msg)) return;
    const key = `${it.projectId}/${it.stamp}`;
    setBusy(key);
    try {
      await deleteMyExport({ data: { workspaceId: getWorkspaceId(), projectId: it.projectId, stamp: it.stamp } });
      setItems((prev) => (prev ?? []).filter((x) => `${x.projectId}/${x.stamp}` !== key));
      toast.success("Export deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That export couldn't be deleted. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-[960px] space-y-5 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Previous Exports</h1>
        <p className="mt-1 text-[14px] text-secondary-text">Every finished export is kept for 30 days.</p>
      </div>
      {items === null ? (
        <p className="text-[13px] text-secondary-text">Loading your exports…</p>
      ) : items.length === 0 ? (
        <section className="rounded-sm bg-card p-10 text-center shadow-card">
          <h2 className="text-[17px] font-semibold">No exports yet</h2>
          <p className="mt-1 text-[13px] text-secondary-text">Exported videos and GIFs will appear here.</p>
          <Button asChild className="mt-4">
            <Link to="/app/ads">Go to Your Ads</Link>
          </Button>
        </section>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <section key={`${it.projectId}/${it.stamp}`} className="rounded-sm bg-card p-4 shadow-card">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link to="/app/ad/$id/export" params={{ id: it.projectId }} className="text-[15px] font-semibold hover:underline">
                  {it.name}
                </Link>
                <span className="flex items-center gap-1 text-[12px] text-secondary-text nums">
                  {when(it.stamp)} · {daysLeft(it.stamp)}
                  <button
                    type="button"
                    data-cta="delete-export"
                    disabled={busy === `${it.projectId}/${it.stamp}`}
                    onClick={() => void remove(it)}
                    aria-label={`Delete export of ${it.name}`}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-secondary-text hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 size={15} strokeWidth={1.7} />
                  </button>
                </span>
              </div>
              <ul className="space-y-1">
                {it.files.map((f) => (
                  <li key={f} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate">{f}</span>
                    <Button variant="ghost" size="sm" onClick={() => void download(it, f)}>
                      <Download strokeWidth={1.7} /> Download
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
