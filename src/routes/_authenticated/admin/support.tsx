import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, fmtDateTime, PageTitle, Pill } from "@/components/admin/AdminShell";
import { adminReplyToTicket, adminSetTicketStatus, adminSupportTickets } from "@/lib/stillframe/admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

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
      <PageTitle title="Client messages" sub="Messages clients send from Contact Gravity Pants." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "answered", "closed", "all"] as const).map((f) => (
          <Button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} variant={filter === f ? "primary" : "plain"}
            className={`h-9 rounded-lg px-3 text-[13px] font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {f === "all" ? "All" : LABEL[f]}
          </Button>
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
            <ReplyBox ticket={t} />
          </Card>
        ))}
        {data && rows.length === 0 && <Card><p className="text-center text-secondary-text">No messages here.</p></Card>}
      </div>
    </>
  );
}

type Ticket = Awaited<ReturnType<typeof adminSupportTickets>>[number];

function ReplyBox({ ticket }: { ticket: Ticket }) {
  const reply = useServerFn(adminReplyToTicket);
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (text: string, id: string, isDraft: boolean) => {
    setBusy(true);
    try {
      const result = await reply({ data: { id: ticket.id, replyId: id, message: text } });
      if (result.sent) {
        toast.success("Reply sent");
        if (isDraft) { setMessage(""); setDraftId(null); }
      } else toast.error("Reply saved, but this client cannot receive app emails. Contact them another way.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send your reply"); }
    finally { setBusy(false); await qc.invalidateQueries({ queryKey: ["admin", "support"] }); }
  };
  const savedDraft = ticket.replies.some((r) => r.id === draftId);
  return (
    <div className="mt-4 border-t border-border pt-4">
      {ticket.replies.map((r) => (
        <div key={r.id} className="mb-4 border-l-2 border-border pl-3">
          <p className="text-[12px] text-secondary-text">Gravity Pants · {fmtDateTime(r.createdAt)} · {r.deliveryStatus === "sent" ? "Sent" : r.deliveryStatus === "suppressed" ? "Email blocked" : r.deliveryStatus === "failed" ? "Not sent" : "Sending not confirmed"}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{r.message}</p>
          {(r.deliveryStatus === "failed" || r.deliveryStatus === "pending") && (
            <Button type="button" variant="plain" size="sm" className="mt-2" disabled={busy} data-cta="admin-support-retry" onClick={() => void send(r.message, r.id, r.id === draftId)}>Try again</Button>
          )}
        </div>
      ))}
      <form onSubmit={(e) => {
        e.preventDefault();
        const id = draftId ?? crypto.randomUUID();
        setDraftId(id);
        void send(message, id, true);
      }}>
        <label htmlFor={`reply-${ticket.id}`} className="mb-2 block text-[13px] font-medium">Reply</label>
        <Textarea id={`reply-${ticket.id}`} value={message} onChange={(e) => { setMessage(e.target.value); setDraftId(null); }} disabled={busy} maxLength={5000} rows={4} className="rounded-sm" />
        <Button type="submit" className="mt-3" disabled={busy || !ticket.email || !message.trim() || savedDraft} data-cta="admin-support-send-reply">
          <Send size={16} strokeWidth={1.7} />{busy ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </div>
  );
}
