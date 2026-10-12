import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, fmtBytes, fmtDateTime, PageTitle, Pill } from "@/components/admin/AdminShell";
import { adminDeleteOwnExport, adminExports } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/exports")({
  head: () => ({ meta: [
    { title: "Admin Exports — Gravity Pants" },
    { name: "description", content: "Private Gravity Pants export history." },
    { property: "og:title", content: "Admin Exports — Gravity Pants" },
    { property: "og:description", content: "Private Gravity Pants export history." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Exports,
});

function Exports() {
  const fn = useServerFn(adminExports);
  const del = useServerFn(adminDeleteOwnExport);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "exports"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = (data ?? [])
    .filter((e) => !mineOnly || e.mine)
    .filter((e) => !q || `${e.client} ${e.ad} ${e.channels.join(" ")} ${e.status}`.toLowerCase().includes(q.toLowerCase()));

  async function remove(id: string, ad: string) {
    if (!window.confirm(`Delete this export of "${ad}"? The files are removed and the export is given back to your account.`)) return;
    setBusy(id);
    try {
      await del({ data: { id } });
      toast.success("Export deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "exports"] });
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the export");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle title="Exports" sub="Every export across all clients, newest first. You can delete your own test exports." />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, ad, channel or status" className="h-11 w-full bg-card sm:h-9 sm:w-[320px]" aria-label="Search exports" />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          My exports only
        </label>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-[13px]">
          <thead className="text-secondary-text">
            <tr className="hairline-b">
              {["Client", "Ad", "Channels", "Formats", "Size", "Status", "Date", ""].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={`hairline-b last:border-0 ${e.status === "failed" ? "bg-destructive/5" : ""}`}>
                <td className="px-4 py-3"><Link to="/admin/clients/$id" params={{ id: e.workspaceId }} className="hover:text-primary">{e.client}</Link></td>
                <td className="px-4 py-3">{e.ad}</td>
                <td className="px-4 py-3">{e.channels.join(", ")}</td>
                <td className="px-4 py-3">{e.formats.join(", ")}</td>
                <td className="px-4 py-3 nums">{fmtBytes(e.bytes)}</td>
                <td className="px-4 py-3">
                  <Pill tone={e.status === "done" ? "good" : e.status === "failed" ? "bad" : "plain"}>{e.status}</Pill>
                  {e.error && <div className="mt-1 max-w-[260px] text-destructive">{e.error}</div>}
                </td>
                <td className="px-4 py-3 nums">{fmtDateTime(e.created_at)}</td>
                <td className="px-4 py-3">
                  {e.mine && (
                    <button type="button" data-cta="admin-delete-own-export" disabled={busy === e.id} onClick={() => void remove(e.id, e.ad)} aria-label={`Delete export of ${e.ad}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary-text hover:text-destructive disabled:opacity-50">
                      <Trash2 size={16} strokeWidth={1.7} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-secondary-text">No exports yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
