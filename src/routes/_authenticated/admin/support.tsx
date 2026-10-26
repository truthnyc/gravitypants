import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, fmtDateTime, PageTitle, Pill } from "@/components/admin/AdminShell";
import { adminSetTicketStatus, adminSupportTickets } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({ meta: [
    { title: "Client messages — Gravity Pants Admin" },
    { name: "description", content: "Private inbox of client messages." },
    { property: "og:title", content: "Client messages — Gravity Pants Admin" },
    { property: "og:description", content: "Private inbox of client messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SupportInbox,
});

const STATUSES = ["open", "answered", "closed"] as const;
const LABEL = { open: "Open", answered: "Answered", closed: "Closed" } as const;

function SupportInbox() {
  const load = useServerFn(adminSupportTickets);
  const setStatus = useServerFn(adminSetTicketStatus);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "support"], queryFn: () => load() });
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("open");
  const rows = (data ?? []).filter((t) => filter === "all" || t.status === filter);

  const change = async (id: string, status: (typeof STATUSES)[number]) => {
    try { await setStatus({ data: { id, status } }); await qc.invalidateQueries({ queryKey: ["admin", "support"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update the message"); }
  };

  return (
    <>
      <PageTitle title="Client messages" sub="Messages clients send from Contact Gravity Pants. Each one is also emailed to help@gravitypants.com — reply by email." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "answered", "closed", "all"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`h-9 rounded-lg px-3 text-[13px] font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {f === "all" ? "All" : LABEL[f]}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <Link to="/admin/clients/$id" params={{ id: t.workspaceId }} className="font-semibold hover:text-primary">{t.client}</Link>
              {t.email && <a href={`mailto:${t.email}`} data-cta="admin-support-reply" className="text-primary">{t.email}</a>}
              <Pill>{t.topic}</Pill>
              {t.priority && <Pill tone="accent">Priority</Pill>}
              <span className="ml-auto nums text-secondary-text">{fmtDateTime(t.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[14px]">{t.message}</p>
            <label className="mt-3 inline-flex items-center gap-2 text-[13px]">
              Status
              <select value={t.status} onChange={(e) => void change(t.id, e.target.value as (typeof STATUSES)[number])} className="h-9 rounded-lg bg-card px-2">
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </label>
          </Card>
        ))}
        {data && rows.length === 0 && <Card><p className="text-center text-secondary-text">No messages here.</p></Card>}
      </div>
    </>
  );
}
