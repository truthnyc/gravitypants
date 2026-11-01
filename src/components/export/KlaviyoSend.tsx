import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { connectKlaviyo, disconnectKlaviyo, getKlaviyoStatus, sendGifToKlaviyo } from "@/lib/stillframe/klaviyo.functions";

/** "Send to Klaviyo" for one exported GIF; asks for the brand's key once if not connected. */
export function KlaviyoSend({
  projectId,
  stamp,
  name,
  connected: connectedProp,
  onConnected,
}: {
  projectId: string;
  stamp: string;
  name: string;
  /** Pass when the parent already knows the status, so many rows share one check. */
  connected?: boolean | null;
  onConnected?: () => void;
}) {
  const status = useServerFn(getKlaviyoStatus);
  const connect = useServerFn(connectKlaviyo);
  const send = useServerFn(sendGifToKlaviyo);
  const [checked, setChecked] = useState<boolean | null>(null);
  const connected = connectedProp !== undefined ? connectedProp : checked;
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (connectedProp !== undefined) return;
    void status({ data: { workspaceId: getWorkspaceId() } }).then((r) => setChecked(r.connected)).catch(() => setChecked(false));
  }, [status, connectedProp]);

  const doSend = async () => {
    setBusy(true);
    try {
      const r = await send({ data: { workspaceId: getWorkspaceId(), projectId, stamp, name } });
      if (r.ok) { setSent(true); toast.success("Sent to your Klaviyo image library"); } else toast.error(r.error);
    } catch { toast.error("Couldn't send to Klaviyo. Try again."); }
    setBusy(false);
  };

  const doConnect = async () => {
    setBusy(true);
    try {
      const r = await connect({ data: { workspaceId: getWorkspaceId(), apiKey: key } });
      if (!r.ok) { toast.error(r.error); setBusy(false); return; }
      setChecked(true); setOpen(false); setKey("");
      onConnected?.();
      toast.success(r.accountName ? `Connected to ${r.accountName}` : "Klaviyo connected");
    } catch (e) { toast.error(e instanceof Error && e.message.includes("pk_") ? "That doesn't look like a Klaviyo private key (it starts with pk_)." : "Couldn't connect. Try again."); setBusy(false); return; }
    setBusy(false);
    await doSend();
  };

  return (
    <>
      <Button variant="ghost" size="sm" data-cta="export-send-klaviyo" disabled={busy || sent || connected === null} onClick={() => (connected ? void doSend() : setOpen(true))}>
        <Mail strokeWidth={1.7} /> {sent ? "Sent" : busy ? "Sending" : "Klaviyo"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Connect Klaviyo</DialogTitle>
            <DialogDescription>Paste a Klaviyo private API key once. GIFs then go straight to your Klaviyo image library.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-1 pl-5 text-[13px] text-ap-body">
            <li>In Klaviyo, open Settings → API keys → Create Private API Key.</li>
            <li>Choose Custom key: Accounts read, Images full access.</li>
            <li>Copy the key and paste it here.</li>
          </ol>
          <Input aria-label="Klaviyo private API key" placeholder="pk_..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-cta="klaviyo-connect" disabled={busy || !key.trim()} onClick={() => void doConnect()}>Connect and send</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Small disconnect link shown in Previous exports when connected. */
export function KlaviyoDisconnect() {
  const status = useServerFn(getKlaviyoStatus);
  const disconnect = useServerFn(disconnectKlaviyo);
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void status({ data: { workspaceId: getWorkspaceId() } }).then((r) => setName(r.connected ? r.accountName ?? "Klaviyo" : undefined)).catch(() => undefined);
  }, [status]);
  if (name === undefined) return null;
  return (
    <p className="text-[12px] text-secondary-text">
      GIFs go to {name}.{" "}
      <button className="text-ap-blue hover:underline" data-cta="klaviyo-disconnect" onClick={() => void disconnect({ data: { workspaceId: getWorkspaceId() } }).then(() => { setName(undefined); toast.success("Klaviyo disconnected"); })}>Disconnect</button>
    </p>
  );
}
