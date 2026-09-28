import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CircleCheck, CircleHelp, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { submitTicket } from "@/lib/stillframe/support.functions";
import { usePlanAccess } from "@/lib/stillframe/plan";
import { cn } from "@/lib/utils";

const TOPICS = [
  ["billing", "Billing"],
  ["bug", "Bug"],
  ["question", "Question"],
  ["feature", "Feature idea"],
] as const;
type Topic = (typeof TOPICS)[number][0];

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-11 lg:size-9" aria-label="Help">
            <CircleHelp strokeWidth={1.7} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild className="h-11 lg:h-9"><Link to="/help">Help center</Link></DropdownMenuItem>
          <DropdownMenuItem className="h-11 lg:h-9" onSelect={() => setOpen(true)}>Contact support</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContactSupportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ContactSupportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const send = useServerFn(submitTicket);
  const { canUse } = usePlanAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const adId = pathname.match(/^\/ad\/([0-9a-f-]{36})\//i)?.[1] ?? null;
  const [topic, setTopic] = useState<Topic>("question");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { priority: boolean }>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => { setDone(null); setMessage(""); setFile(null); setTopic("question"); }, 200);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const ws = getWorkspaceId();
      let attachmentPath: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
        attachmentPath = `${ws}/support/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(attachmentPath, file, { contentType: file.type });
        if (error) throw new Error("We couldn't upload the screenshot. Try a smaller image, or send without it.");
      }
      const r = await send({ data: { workspaceId: ws, topic, message, adId, attachmentPath, origin: window.location.origin } });
      if ("error" in r) throw new Error(r.error);
      setDone({ priority: r.priority });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="w-[calc(100vw-24px)] rounded-sm sm:max-w-[460px]">
        {done ? (
          <div className="py-4 text-center">
            <CircleCheck className="mx-auto size-10 text-primary" strokeWidth={1.7} />
            <DialogTitle className="mt-3 text-[17px]">Message sent</DialogTitle>
            <p className="mt-1 text-[14px] text-secondary-text">
              {done.priority ? "Priority support: we'll reply within 6 hours." : "We'll reply within 24 hours."}
            </p>
            <Button className="mt-5 h-11 lg:h-9" onClick={() => reset(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader><DialogTitle className="text-[17px]">Contact support</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <span className="text-[12px] text-secondary-text">Topic</span>
              <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-control-fill p-0.5 sm:grid-cols-4">
                {TOPICS.map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={topic === v} onClick={() => setTopic(v)}
                    className={cn("h-11 rounded-lg px-2 text-[13px] font-medium lg:h-8", topic === v && "bg-card shadow-segment")}>{l}</button>
                ))}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[12px] text-secondary-text">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={5000}
                placeholder="What can we help with?"
                className="w-full resize-none rounded-sm bg-control-fill p-3 text-[16px] placeholder:text-secondary-text focus-visible:outline-none lg:text-[14px]" />
            </label>
            <div>
              <input ref={input} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 10 * 1024 * 1024) { toast.error("Screenshots can be up to 10 MB."); return; } setFile(f); e.target.value = ""; }} />
              {file ? (
                <div className="flex h-11 items-center gap-2 rounded-sm bg-control-fill px-3 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button type="button" aria-label="Remove screenshot" className="grid size-11 place-items-center -mr-3" onClick={() => setFile(null)}><X className="size-4" strokeWidth={1.7} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => input.current?.click()} className="flex h-11 items-center gap-2 text-[14px] font-medium text-link">
                  <ImagePlus className="size-4" strokeWidth={1.7} /> Add a screenshot (optional)
                </button>
              )}
            </div>
            <p className="text-[12px] text-secondary-text">
              {adId ? "We'll include a link to the ad you're working on. " : ""}
              {canUse("priority_support") ? "Priority support: we'll reply within 6 hours." : "We'll reply within 24 hours."}
            </p>
            <DialogFooter className="gap-2">
              <Button variant="plain" className="h-11 lg:h-9" onClick={() => reset(false)}>Cancel</Button>
              <Button className="h-11 lg:h-9" disabled={busy || message.trim().length < 3} onClick={() => void submit()}>{busy ? "Sending…" : "Send"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
