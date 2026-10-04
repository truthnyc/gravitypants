import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, fmtBytes, fmtDate, PageTitle, Pill, planLabel, statusLabel, statusTone } from "@/components/admin/AdminShell";
import { adminClients, adminInviteClient } from "@/lib/stillframe/admin.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  head: () => ({ meta: [
    { title: "Admin Clients — Gravity Pants" },
    { name: "description", content: "Private Gravity Pants client list." },
    { property: "og:title", content: "Admin Clients — Gravity Pants" },
    { property: "og:description", content: "Private Gravity Pants client list." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Clients,
});

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
      <PageTitle title="Clients" sub={data ? `${rows.length} of ${data.length}` : undefined} right={<InviteClient />} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-11 w-full bg-card sm:h-9 sm:w-[260px]" aria-label="Search clients" />
        <F label="Plan" value={plan} set={setPlan} items={[["all", "All plans"], ["trial", "Trial"], ["simple", "Simple"], ["simple_yearly", "Simple Yearly"], ["business", "Business"], ["business_yearly", "Business Yearly"], ["none", "No plan"]]} />
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

function InviteClient() {
  const invite = useServerFn(adminInviteClient);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"simple" | "business" | "team">("business");
  const [until, setUntil] = useState(() => new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && until && reason.trim().length >= 3;

  async function run() {
    setBusy(true);
    try {
      const r = await invite({ data: { email, name: name || undefined, plan, until, reason } });
      if ("error" in r) return void toast.error(r.error);
      toast.success(`Invite sent to ${email.trim()}`);
      setOpen(false);
      setEmail(""); setName(""); setReason("");
      await qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      void navigate({ to: "/admin/clients/$id", params: { id: r.workspaceId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite client</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader><DialogTitle>Invite client</DialogTitle></DialogHeader>
          <div className="space-y-4 text-[14px]">
            <p className="text-secondary-text">They get an email to set up their account. The plan is free until the date you pick, no card needed.</p>
            <label className="block"><span className="mb-1 block text-secondary-text">Email</span><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@brand.com" /></label>
            <label className="block"><span className="mb-1 block text-secondary-text">Name (optional)</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <div className="flex flex-wrap items-center gap-2">
              {(["simple", "business", "team"] as const).map((p) => (
                <Button key={p} variant={plan === p ? "default" : "plain"} size="sm" onClick={() => setPlan(p)}>{planLabel(p)}</Button>
              ))}
              <span className="text-secondary-text">until</span>
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-8 w-40" aria-label="End date" />
            </div>
            <label className="block"><span className="mb-1 block text-secondary-text">Reason</span><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="A short note for the log" /></label>
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!ok || busy} onClick={() => void run()}>{busy ? "Sending…" : "Send invite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
