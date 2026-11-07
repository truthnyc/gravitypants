import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminMarketingSender, adminSendMarketingEmail } from "@/lib/stillframe/admin.functions";
import { marketingSendInput, type MarketingSendInput } from "@/lib/stillframe/marketing-send";
import { MarketingCampaignSend } from "./MarketingCampaignSend";

export function MarketingEmailSend({ subject, body }: { subject: string; body: string }) {
  const [provider, setProvider] = useState<"gmail" | "campaign-monitor">("gmail");
  const senderFn = useServerFn(adminMarketingSender);
  const sendFn = useServerFn(adminSendMarketingEmail);
  const sender = useQuery({ queryKey: ["admin", "marketing-sender"], queryFn: () => senderFn(), retry: false, staleTime: 60000 });
  const [to, setTo] = useState("");
  const [approval, setApproval] = useState<MarketingSendInput | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const sending = useMutation({ mutationFn: (input: MarketingSendInput) => sendFn({ data: input }), retry: false,
    onSuccess: () => setApproval(null), onError: () => setApproval(null),
  });
  const attempted = sending.isPending || sending.isSuccess || sending.isError;
  return <div className="space-y-3 border-y border-border py-4">
    <div role="tablist" aria-label="Email delivery" className="flex w-fit max-w-full gap-1 rounded-lg bg-control-fill p-1">
      <Button role="tab" aria-selected={provider === "gmail"} variant={provider === "gmail" ? "outline" : "ghost"} size="sm" disabled={sending.isPending} onClick={() => setProvider("gmail")}>Gmail</Button>
      <Button role="tab" aria-selected={provider === "campaign-monitor"} variant={provider === "campaign-monitor" ? "outline" : "ghost"} size="sm" disabled={sending.isPending} onClick={() => setProvider("campaign-monitor")}>Campaign Monitor</Button>
    </div>
    <div hidden={provider !== "campaign-monitor"}><MarketingCampaignSend subject={subject} body={body} /></div>
    <div hidden={provider !== "gmail"} className="space-y-3">
    <label className="block text-sm font-medium">Recipient email<Input type="email" className="mt-2 bg-card" value={to} maxLength={254} disabled={attempted} onChange={(e) => setTo(e.target.value)} /></label>
    {sender.data && <p className="break-all text-xs text-secondary-text">From: {sender.data.email}</p>}
    {sender.isPending && <p role="status" className="text-xs text-secondary-text">Checking Gmail…</p>}
    {sender.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{sender.error instanceof Error ? sender.error.message : "Couldn't check Gmail."}</p><Button size="sm" variant="outline" disabled={sender.isFetching} onClick={() => void sender.refetch()}>Check Gmail again</Button></div>}
    <Button variant="outline" disabled={!sender.data || !!sender.error || attempted} onClick={() => {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      const parsed = marketingSendInput.safeParse({ requestId: requestId.current, to, subject, body, approved: true });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the recipient and email."); return; }
      setError(""); setApproval(parsed.data);
    }}><Send className="size-4" strokeWidth={1.7} />Review & send email</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {sending.data && <p role="status" className="flex items-start gap-2 text-sm">{sending.data.status === "sent" && <Check className="size-4 shrink-0" strokeWidth={1.7} />}{sending.data.message}</p>}
    {sending.error && <p role="alert" className="text-sm text-destructive">{sending.error instanceof Error ? sending.error.message : "Sending could not be confirmed. Check Gmail Sent before sending again."}</p>}
    <Dialog open={!!approval} onOpenChange={(open) => { if (!open && !sending.isPending) setApproval(null); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg" onEscapeKeyDown={(e) => { if (sending.isPending) e.preventDefault(); }} onPointerDownOutside={(e) => { if (sending.isPending) e.preventDefault(); }}>
        <DialogHeader><DialogTitle>Approve this email</DialogTitle><DialogDescription>This sends one real email from your connected Gmail account.</DialogDescription></DialogHeader>
        {approval && <div className="space-y-3 text-sm"><p className="break-all"><span className="font-medium">From:</span> {sender.data?.email}</p><p className="break-all"><span className="font-medium">To:</span> {approval.to}</p><p className="break-words font-medium">{approval.subject}</p><div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words border-y border-border py-4">{approval.body}</div></div>}
        <DialogFooter className="gap-2"><Button variant="outline" disabled={sending.isPending} onClick={() => setApproval(null)}>Cancel</Button><Button disabled={sending.isPending || !approval} onClick={() => { if (approval && !attempted) sending.mutate(approval); }}>{sending.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={1.7} />}{sending.isPending ? "Sending…" : "Approve & send"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  </div>;
}