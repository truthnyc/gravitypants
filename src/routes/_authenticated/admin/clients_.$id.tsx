import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, fmtBytes, fmtDate, fmtDateTime, fmtMoney, Pill, planLabel, statusLabel, statusTone } from "@/components/admin/AdminShell";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { adminAction, adminClient, adminSupport } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/clients_/$id")({
  head: () => ({ meta: [
    { title: "Admin Client — Gravity Pants" },
    { name: "description", content: "Private Gravity Pants client details." },
    { property: "og:title", content: "Admin Client — Gravity Pants" },
    { property: "og:description", content: "Private Gravity Pants client details." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ClientPage,
});

type Act = "extend_trial" | "comp_plan" | "end_comp" | "reset_exports" | "suspend" | "unsuspend" | "delete" | "support";
const TITLES: Record<Act, string> = {
  extend_trial: "Extend trial",
  comp_plan: "Give free plan",
  end_comp: "End free plan",
  reset_exports: "Reset this month's exports",
  suspend: "Pause client",
  unsuspend: "Unpause client",
  delete: "Delete client",
  support: "Edit as Support",
};

function ClientPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(adminClient);
  const qc = useQueryClient();
  const { data, error, refetch } = useQuery({ queryKey: ["admin", "client", id], queryFn: () => fn({ data: { id } }) });
  const [act, setAct] = useState<Act | null>(null);
  const support = useServerFn(adminSupport);

  if (error) return <p className="text-destructive">Couldn't load this client.</p>;
  if (!data) return <div aria-busy="true" className="h-96" />;
  const { client: c } = data;
  const supporting = !!data.supportUntil && new Date(data.supportUntil) > new Date();
  const stripeUrl = c.stripeCustomerId ? `https://dashboard.stripe.com/${c.environment === "live" ? "" : "test/"}customers/${c.stripeCustomerId}` : null;

  const endSupport = async () => {
    await support({ data: { id, start: false } });
    toast("Support editing ended");
    void refetch();
  };

  return (
    <>
      <Link to="/admin/clients" className="mb-3 inline-flex items-center gap-1 text-[13px] text-secondary-text hover:text-foreground">
        <ChevronLeft className="size-4" strokeWidth={1.7} /> Clients
      </Link>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div className="min-w-0 max-w-full">
          <h1 className="break-words text-[28px] font-bold tracking-[-0.02em]">{c.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 break-all text-[14px] text-secondary-text">
            {c.ownerEmail}
            <Pill tone="accent">{planLabel(c.plan)}{c.comp ? " · free" : ""}</Pill>
            <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button variant="plain" size="header" onClick={() => document.getElementById("ads")?.scrollIntoView({ behavior: "smooth" })}>View Their Ads</Button>
          {supporting ? (
            <Button size="header" onClick={() => void endSupport()}>End Support · until {new Date(data.supportUntil!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Button>
          ) : (
            <Button size="header" onClick={() => setAct("support")}>Edit as Support</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal strokeWidth={1.7} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setAct("extend_trial")}>Extend trial…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAct("comp_plan")}>Give free plan…</DropdownMenuItem>
              {c.comp && <DropdownMenuItem onSelect={() => setAct("end_comp")}>End free plan…</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => setAct("reset_exports")}>Reset this month's exports…</DropdownMenuItem>
              <DropdownMenuSeparator />
              {c.suspended ? (
                <DropdownMenuItem onSelect={() => setAct("unsuspend")}>Unpause client…</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setAct("suspend")}>Pause client…</DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onSelect={() => setAct("delete")}>Delete client…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-[15px] font-semibold">Members</h2>
          <ul className="divide-y divide-border text-[14px]">
            {data.members.map((m: { userId: string; email: string; role: string; lastSignIn: string | null }) => (
              <li key={m.userId} className="flex items-center justify-between py-2">
                <span>{m.email} <span className="text-secondary-text">· {m.role}</span></span>
                <span className="text-[13px] text-secondary-text nums">Last sign-in {fmtDateTime(m.lastSignIn)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Billing</h2>
            {stripeUrl && (
              <a href={stripeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-primary">
                Open in Stripe <ExternalLink className="size-3.5" strokeWidth={1.7} />
              </a>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-y-1.5 text-[14px]">
            <dt className="text-secondary-text">Plan</dt><dd>{planLabel(c.plan)}{c.comp && ` (free until ${fmtDate(c.compUntil)})`}</dd>
            <dt className="text-secondary-text">Stripe status</dt><dd>{data.stripeStatus ?? "No subscription"}</dd>
            <dt className="text-secondary-text">Trial ends</dt><dd className="nums">{fmtDate(c.trialEndsAt)}</dd>
            <dt className="text-secondary-text">Next invoice</dt><dd className="nums">{data.next ? `${fmtMoney(data.next.amount)} on ${fmtDate(new Date(data.next.date * 1000).toISOString())}` : "—"}</dd>
          </dl>
          {data.invoices.length > 0 && (
            <ul className="mt-3 divide-y divide-border text-[13px]">
              {data.invoices.map((i) => (
                <li key={i.id} className="flex justify-between py-1.5 nums">
                  <span>{fmtDate(new Date(i.created * 1000).toISOString())}</span>
                  <span>{fmtMoney(i.amount)} · {i.status}</span>
                  {i.url ? <a className="text-primary" href={i.url} target="_blank" rel="noreferrer">View</a> : <span />}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-[15px] font-semibold">Usage</h2>
          <div className="flex gap-10 text-[14px]">
            <div><div className="text-secondary-text">Storage used</div><div className="text-[22px] font-bold nums">{fmtBytes(c.storageBytes)}</div></div>
            <div><div className="text-secondary-text">Exports this month</div><div className="text-[22px] font-bold nums">{c.exportsThisMonth}</div></div>
            <div>
              <div className="text-secondary-text">Exports by month</div>
              <div className="mt-1 flex flex-wrap gap-2 nums">
                {data.exportsByMonth.length ? data.exportsByMonth.map(([m, n]) => <Pill key={m}>{m} · {n}</Pill>) : "—"}
              </div>
            </div>
          </div>
          <h3 className="mb-1 mt-4 text-[13px] font-semibold">Last 10 exports</h3>
          {data.recentExports.length === 0 ? (
            <p className="text-[13px] text-secondary-text">None yet.</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <tbody>
                {data.recentExports.map((e) => (
                  <tr key={e.id} className="hairline-b last:border-0">
                    <td className="py-1.5">{(e.channels as string[]).join(", ")}</td>
                    <td>{(e.formats as string[]).join(", ")}</td>
                    <td className="nums">{fmtBytes(Number(e.total_bytes))}</td>
                    <td>{e.status}</td>
                    <td className="nums">{fmtDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <h2 id="ads" className="mb-3 mt-8 text-[17px] font-semibold">Ads · {data.ads.length}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.ads.map((a) => (
          <Link key={a.id} to="/ad/$id/edit" params={{ id: a.id }} className="overflow-hidden rounded-sm bg-card shadow-card hover:ring-2 hover:ring-primary">
            <div className="flex aspect-square items-center justify-center bg-control-fill">
              {a.thumbnail_url ? <MediaImage path={a.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[12px] text-secondary-text">{a.primary_format}</span>}
            </div>
            <div className="p-3">
              <div className="truncate text-[14px] font-medium">{a.name}</div>
              <div className="text-[12px] text-secondary-text nums">{fmtDate(a.updated_at)}</div>
            </div>
          </Link>
        ))}
      </div>

      {act && (
        <ActionDialog
          act={act}
          name={c.name}
          id={id}
          onClose={() => setAct(null)}
          onDone={() => {
            setAct(null);
            void qc.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      )}
    </>
  );
}

function ActionDialog({ act, name, id, onClose, onDone }: { act: Act; name: string; id: string; onClose: () => void; onDone: () => void }) {
  const action = useServerFn(adminAction);
  const support = useServerFn(adminSupport);
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState<"simple" | "business">("business");
  const [until, setUntil] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = reason.trim().length >= 3 && (act !== "delete" || confirmName === name);

  const run = async () => {
    setBusy(true);
    try {
      if (act === "support") await support({ data: { id, start: true, reason } });
      else await action({ data: { id, action: act, reason, days, plan, until, confirmName } });
      toast(act === "support" ? "Support editing on for 60 minutes" : `${TITLES[act]} done`);
      if (act === "delete") navigate({ to: "/admin/clients" });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>{TITLES[act]}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-[14px]">
          {act === "support" && <p className="text-secondary-text">You can change {name}'s ads for 60 minutes. Every change is logged.</p>}
          {act === "suspend" && <p className="text-secondary-text">Members can still sign in, but see "Your account is paused" and can't export.</p>}
          {act === "delete" && <p className="text-destructive">This removes all of {name}'s ads, photos and files and cancels their subscription. It can't be undone.</p>}
          {act === "extend_trial" && (
            <div className="flex items-center gap-2">
              {[7, 15].map((d) => (
                <Button key={d} variant={days === d ? "default" : "plain"} size="sm" onClick={() => setDays(d)}>+{d} days</Button>
              ))}
              <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20" aria-label="Custom days" />
              <span className="text-secondary-text">days</span>
            </div>
          )}
          {act === "comp_plan" && (
            <div className="flex items-center gap-2">
              {(["simple", "business"] as const).map((p) => (
                <Button key={p} variant={plan === p ? "default" : "plain"} size="sm" onClick={() => setPlan(p)}>{planLabel(p)}</Button>
              ))}
              <span className="text-secondary-text">until</span>
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-8 w-40" aria-label="End date" />
            </div>
          )}
          {act === "delete" && (
            <label className="block">
              <span className="mb-1 block text-secondary-text">Type <b className="text-foreground">{name}</b> to confirm</span>
              <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-secondary-text">Reason</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="A short note for the log" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button variant={act === "delete" ? "destructive" : "default"} disabled={!ok || busy} onClick={() => void run()}>{TITLES[act]}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
