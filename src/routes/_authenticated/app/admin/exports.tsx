import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Card, fmtBytes, fmtDateTime, PageTitle, Pill } from "@/components/admin/AdminShell";
import { adminExports } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin/exports")({
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
  const { data } = useQuery({ queryKey: ["admin", "exports"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((e) => !q || `${e.client} ${e.ad} ${e.channels.join(" ")} ${e.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageTitle title="Exports" sub="Every export across all clients, newest first." />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, ad, channel or status" className="mb-4 h-11 w-full bg-card sm:h-9 sm:w-[320px]" aria-label="Search exports" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-[13px]">
          <thead className="text-secondary-text">
            <tr className="hairline-b">
              {["Client", "Ad", "Channels", "Formats", "Size", "Status", "Date"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={`hairline-b last:border-0 ${e.status === "failed" ? "bg-destructive/5" : ""}`}>
                <td className="px-4 py-3"><Link to="/app/admin/clients/$id" params={{ id: e.workspaceId }} className="hover:text-primary">{e.client}</Link></td>
                <td className="px-4 py-3">{e.ad}</td>
                <td className="px-4 py-3">{e.channels.join(", ")}</td>
                <td className="px-4 py-3">{e.formats.join(", ")}</td>
                <td className="px-4 py-3 nums">{fmtBytes(e.bytes)}</td>
                <td className="px-4 py-3">
                  <Pill tone={e.status === "done" ? "good" : e.status === "failed" ? "bad" : "plain"}>{e.status}</Pill>
                  {e.error && <div className="mt-1 max-w-[260px] text-destructive">{e.error}</div>}
                </td>
                <td className="px-4 py-3 nums">{fmtDateTime(e.created_at)}</td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-secondary-text">No exports yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
