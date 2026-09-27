import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, fmtBytes, fmtDate, PageTitle, Pill, planLabel, statusLabel, statusTone } from "@/components/admin/AdminShell";
import { adminClients } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/clients")({ component: Clients });

function Clients() {
  const fn = useServerFn(adminClients);
  const { data } = useQuery({ queryKey: ["admin", "clients"], queryFn: () => fn() });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [since, setSince] = useState("all");

  const rows = useMemo(() => {
    const cutoff = since === "all" ? 0 : Date.now() - Number(since) * 864e5;
    return (data ?? [])
      .filter((c) => !q || `${c.name} ${c.ownerEmail}`.toLowerCase().includes(q.toLowerCase()))
      .filter((c) => plan === "all" || c.plan === plan)
      .filter((c) => status === "all" || c.status === status)
      .filter((c) => kind === "all" || (kind === "paying" ? c.paying : c.plan === "trial"))
      .filter((c) => new Date(c.signedUp).getTime() >= cutoff)
      .sort((a, b) => b.signedUp.localeCompare(a.signedUp));
  }, [data, q, plan, status, kind, since]);

  const F = ({ value, set, items, label }: { value: string; set: (v: string) => void; items: [string, string][]; label: string }) => (
    <Select value={value} onValueChange={set}>
      <SelectTrigger className="h-9 w-[150px] bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(([v, l]) => (
          <SelectItem key={v} value={v}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageTitle title="Clients" sub={data ? `${rows.length} of ${data.length}` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-9 w-[260px] bg-card" aria-label="Search clients" />
        <F label="Plan" value={plan} set={setPlan} items={[["all", "All plans"], ["trial", "Trial"], ["simple", "Simple"], ["business", "Business"], ["business_yearly", "Business Yearly"], ["none", "No plan"]]} />
        <F label="Status" value={status} set={setStatus} items={[["all", "All statuses"], ["trialing", "Trial"], ["active", "Active"], ["past_due", "Payment problem"], ["canceled", "Canceled"], ["suspended", "Paused"]]} />
        <F label="Trial or paying" value={kind} set={setKind} items={[["all", "Trial and paying"], ["trial", "Trial only"], ["paying", "Paying only"]]} />
        <F label="Signed up" value={since} set={setSince} items={[["all", "Any sign-up date"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-[13px]">
          <thead className="text-secondary-text">
            <tr className="hairline-b">
              {["Client", "Plan", "Status", "Trial ends / renews", "Exports", "Ads", "Storage", "Signed up", "Last active"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="cursor-pointer hairline-b last:border-0 hover:bg-canvas" onClick={() => navigate({ to: "/admin/clients/$id", params: { id: c.id } })}>
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-secondary-text">{c.ownerEmail}</div>
                </td>
                <td className="px-4 py-3">{planLabel(c.plan)}{c.comp && " (free)"}</td>
                <td className="px-4 py-3"><Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill></td>
                <td className="px-4 py-3 nums">{fmtDate(c.plan === "trial" ? c.trialEndsAt : c.comp ? c.compUntil : c.renewsAt)}</td>
                <td className="px-4 py-3 nums">{c.exportsThisMonth}</td>
                <td className="px-4 py-3 nums">{c.ads}</td>
                <td className="px-4 py-3 nums">{fmtBytes(c.storageBytes)}</td>
                <td className="px-4 py-3 nums">{fmtDate(c.signedUp)}</td>
                <td className="px-4 py-3 nums">{fmtDate(c.lastActive)}</td>
              </tr>
            ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-secondary-text">No clients match.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
