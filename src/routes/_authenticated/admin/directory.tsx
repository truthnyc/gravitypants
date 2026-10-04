import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listDirectoryReview, reviewDirectoryReel } from "@/lib/directory/directory.functions";
import { STATUS_LABEL } from "@/lib/directory/directory";

export const Route = createFileRoute("/_authenticated/admin/directory")({
  head: () => ({ meta: [{ title: "Directory review — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDirectory,
});

function AdminDirectory() {
  const list = useServerFn(listDirectoryReview);
  const review = useServerFn(reviewDirectoryReel);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "directory"], queryFn: () => list() });
  const act = async (id: string, action: "approve" | "hide") => {
    try { await review({ data: { id, action } }); toast(action === "approve" ? "Approved — the reel is live" : "Hidden"); void qc.invalidateQueries({ queryKey: ["admin", "directory"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work"); }
  };
  const rows = q.data ?? [];
  const waiting = rows.filter((r) => r.status === "in_review");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Directory</h1>
        <p className="text-[14px] text-secondary-text">First reels from each brand wait here for a quick review. After approval, that brand's new reels go live straight away.</p>
      </div>
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Waiting for review · {waiting.length}</h2>
        <div className="space-y-2">
          {waiting.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-sm bg-card p-3 shadow-card">
              <div className="size-16 shrink-0 overflow-hidden rounded-sm bg-control-fill">{r.poster && <img src={r.poster} alt="" className="size-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.brand} · {r.ad}</div>
                <div className="truncate text-[13px] text-secondary-text">{[...r.moods, ...r.tags].join(" · ") || "No keywords"}{r.website ? ` · ${r.website}` : ""}</div>
              </div>
              <Button size="sm" onClick={() => void act(r.id, "approve")}>Approve</Button>
              <Button size="sm" variant="plain" onClick={() => void act(r.id, "hide")}>Hide</Button>
            </div>
          ))}
          {!waiting.length && <p className="text-[14px] text-secondary-text">Nothing waiting.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">All Directory reels</h2>
        <table className="w-full text-left text-[13px]">
          <thead><tr className="text-secondary-text"><th className="py-1.5">Brand</th><th>Ad</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2"><a href={`/directory/${r.slug}`} target="_blank" rel="noreferrer" className="text-link">{r.brand}</a></td>
                <td>{r.ad}</td>
                <td>{STATUS_LABEL[r.status]}</td>
                <td className="text-right">{r.status === "live" && <Button size="sm" variant="plain" onClick={() => void act(r.id, "hide")}>Hide</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
