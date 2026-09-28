import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Card, fmtDateTime, PageTitle } from "@/components/admin/AdminShell";
import { adminAudit } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [
    { title: "Admin Audit Log — Gravity Pants" },
    { name: "description", content: "Private Gravity Pants administrator activity." },
    { property: "og:title", content: "Admin Audit Log — Gravity Pants" },
    { property: "og:description", content: "Private Gravity Pants administrator activity." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Audit,
});

const LABEL: Record<string, string> = {
  view_client: "Viewed client", open_ad: "Opened ad", support_start: "Started support editing", support_end: "Ended support editing",
  support_write: "Changed during support", extend_trial: "Extended trial", comp_plan: "Gave free plan", end_comp: "Ended free plan",
  reset_exports: "Reset exports", suspend: "Paused client", unsuspend: "Unpaused client", delete: "Deleted client",
  grant_admin: "Added admin", revoke_admin: "Removed admin",
};

function Audit() {
  const fn = useServerFn(adminAudit);
  const { data } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fn() });
  const [admin, setAdmin] = useState("");
  const [client, setClient] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          (!admin || r.admin.toLowerCase().includes(admin.toLowerCase())) &&
          (!client || r.client.toLowerCase().includes(client.toLowerCase())) &&
          (!action || (LABEL[r.action] ?? r.action).toLowerCase().includes(action.toLowerCase())) &&
          (!from || r.created_at.slice(0, 10) >= from) &&
          (!to || r.created_at.slice(0, 10) <= to),
      ),
    [data, admin, client, action, from, to],
  );
  return (
    <>
      <PageTitle title="Audit Log" sub="Everything admins do. Nobody can edit or delete it." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="Admin" className="h-9 w-[180px] bg-card" aria-label="Filter by admin" />
        <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" className="h-9 w-[180px] bg-card" aria-label="Filter by client" />
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action" className="h-9 w-[180px] bg-card" aria-label="Filter by action" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px] bg-card" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px] bg-card" aria-label="To date" />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-[13px]">
          <thead className="text-secondary-text">
            <tr className="hairline-b">{["When", "Admin", "Action", "Client", "Details", "Reason"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hairline-b last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-2.5 nums">{fmtDateTime(r.created_at)}</td>
                <td className="px-4 py-2.5">{r.admin}</td>
                <td className="px-4 py-2.5">{LABEL[r.action] ?? r.action}</td>
                <td className="px-4 py-2.5">{r.client}</td>
                <td className="max-w-[260px] break-words px-4 py-2.5 text-secondary-text">{r.target}</td>
                <td className="max-w-[220px] break-words px-4 py-2.5">{r.reason}</td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-secondary-text">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
