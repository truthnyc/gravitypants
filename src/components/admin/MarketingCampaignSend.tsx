import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminCampaignOptions, adminReviewCampaign, adminSendCampaign } from "@/lib/stillframe/admin.functions";
import { campaignInput, type CampaignInput, type CampaignReview } from "@/lib/stillframe/marketing-campaign";

const message = (error: unknown) => error instanceof Error ? error.message : "Couldn't complete the campaign request.";
export function MarketingCampaignSend({ subject, body }: { subject: string; body: string }) {
  const optionsFn = useServerFn(adminCampaignOptions), reviewFn = useServerFn(adminReviewCampaign), sendFn = useServerFn(adminSendCampaign);
  const options = useQuery({ queryKey: ["admin", "campaign-monitor-options"], queryFn: () => optionsFn(), retry: false });
  const [clientId, setClientId] = useState(""), [listId, setListId] = useState("");
  const [fromName, setFromName] = useState(""), [fromEmail, setFromEmail] = useState(""), [replyTo, setReplyTo] = useState(""), [confirmationEmail, setConfirmationEmail] = useState("");
  const [permission, setPermission] = useState(false), [validation, setValidation] = useState(""), [approval, setApproval] = useState<CampaignReview | null>(null);
  const client = options.data?.find((item) => item.id === clientId);
  const reviewing = useMutation({ mutationFn: (input: CampaignInput) => reviewFn({ data: input }), retry: false, onSuccess: setApproval });
  const sending = useMutation({ mutationFn: (requestId: string) => sendFn({ data: { requestId, approved: true } }), retry: false, onSettled: () => setApproval(null) });
  const locked = sending.isPending || sending.isSuccess || sending.isError;
  return <div className="space-y-4">
    {options.isPending && <p role="status" className="text-sm text-secondary-text">Checking Campaign Monitor…</p>}
    {options.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{message(options.error)}</p><Button variant="outline" size="sm" onClick={() => void options.refetch()}>Check connection again</Button></div>}
    {options.data && <fieldset disabled={locked || reviewing.isPending} className="min-w-0 space-y-4">
      <label className="block text-sm font-medium">Campaign Monitor client<Select value={clientId} onValueChange={(id) => { setClientId(id); setListId(""); }}><SelectTrigger aria-label="Campaign Monitor client" className="mt-2 bg-card"><SelectValue placeholder="Choose a client" /></SelectTrigger><SelectContent>{options.data.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label>
      <label className="block text-sm font-medium">Subscriber list<Select value={listId} onValueChange={setListId} disabled={!client}><SelectTrigger aria-label="Subscriber list" className="mt-2 bg-card"><SelectValue placeholder="Choose a list" /></SelectTrigger><SelectContent>{client?.lists.map((list) => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}</SelectContent></Select></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Sender name<Input className="mt-2 bg-card" value={fromName} maxLength={100} onChange={(e) => setFromName(e.target.value)} /></label>
        <label className="block text-sm font-medium">Sender email<Input type="email" className="mt-2 bg-card" value={fromEmail} maxLength={254} onChange={(e) => setFromEmail(e.target.value)} /></label>
        <label className="block text-sm font-medium">Reply-to email<Input type="email" className="mt-2 bg-card" value={replyTo} maxLength={254} onChange={(e) => setReplyTo(e.target.value)} /></label>
        <label className="block text-sm font-medium">Send confirmation to<Input type="email" className="mt-2 bg-card" value={confirmationEmail} maxLength={254} onChange={(e) => setConfirmationEmail(e.target.value)} /></label>
      </div>
      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5 shrink-0" checked={permission} onCheckedChange={(value) => setPermission(value === true)} /><span>Everyone on this list has permission to receive this marketing email.</span></label>
      <p className="text-xs text-secondary-text">An unsubscribe link is included. Campaign Monitor charges and sender approval requirements apply.</p>
      <Button variant="outline" disabled={!permission || reviewing.isPending} onClick={() => {
        const parsed = campaignInput.safeParse({ clientId, listId, fromName, fromEmail, replyTo, confirmationEmail, subject, body, permissionConfirmed: permission });
        if (!parsed.success) { setValidation("Choose a client and list, then complete all sender and confirmation details."); return; }
        setValidation(""); reviewing.mutate(parsed.data);
      }}>{reviewing.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={1.7} />}{reviewing.isPending ? "Checking audience…" : "Review campaign"}</Button>
    </fieldset>}
    {(validation || reviewing.error || sending.error) && <p role="alert" className="text-sm text-destructive">{validation || message(reviewing.error || sending.error)}</p>}
    {sending.data && <p role="status" className="text-sm">{sending.data.message}</p>}
    <Dialog open={!!approval} onOpenChange={(open) => { if (!open && !sending.isPending) setApproval(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-lg" onEscapeKeyDown={(event) => { if (sending.isPending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (sending.isPending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>Approve this campaign</DialogTitle><DialogDescription>This sends a real marketing email to the selected subscriber list, not just one contact.</DialogDescription></DialogHeader>
        {approval && <div className="space-y-3 text-sm"><p><strong>{approval.clientName} · {approval.listName}</strong><br /><span className="tabular-nums">{approval.recipients} active subscribers</span> · current audience</p><p className="break-all">From: {approval.input.fromName} &lt;{approval.input.fromEmail}&gt;<br />Reply to: {approval.input.replyTo}<br />Confirmation: {approval.input.confirmationEmail}</p><p className="break-words font-medium">{approval.input.subject}</p><div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-y border-border py-4">{approval.input.body}</div><p className="text-xs text-secondary-text">Unsubscribe link included. Review expires in 10 minutes. Campaign Monitor excludes suppressed addresses and determines final delivery.</p></div>}
        <DialogFooter className="gap-2"><Button variant="outline" disabled={sending.isPending} onClick={() => setApproval(null)}>Cancel</Button><Button disabled={!approval || locked} onClick={() => { if (approval && !locked) sending.mutate(approval.requestId); }}>{sending.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={1.7} />}{sending.isPending ? "Sending…" : "Approve & send campaign"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}