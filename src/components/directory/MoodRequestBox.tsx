import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { requestMood } from "@/lib/directory/moods.functions";
import { peekWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";

/**
 * Moods come from one shared list, so people who can't find the one they want ask for it.
 * The request goes to the admin mood queue; nothing appears publicly until staff approve it.
 */
export function MoodRequestBox({ className }: { className?: string }) {
  const ask = useServerFn(requestMood);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async () => {
    const v = name.trim();
    if (v.length < 2 || busy) return;
    setBusy(true);
    try {
      const ws = peekWorkspaceId();
      const r = await ask({ data: { name: v, ...(ws ? { workspaceId: ws } : {}) } });
      setSent(r.name);
      setName("");
      toast("Mood requested — our team will review it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("mt-2.5", className)}>
      <p className="text-[12px] leading-[1.5] text-ap-muted">
        {sent
          ? <>“{sent}” is waiting for our team. You'll be able to pick it once it's approved.</>
          : "Can't see the mood you want? Ask for it — our team reviews requests and adds the good ones to the list."}
      </p>
      {!sent && (
        <div className="mt-1.5 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
            placeholder="e.g. Sun-warmed"
            maxLength={30}
            aria-label="Mood you'd like us to add"
            className="h-9 w-[220px] max-w-full rounded-lg border border-ap-hairline bg-ap-card px-2.5 text-[14px] outline-hidden focus:border-ap-blue"
          />
          <button type="button" disabled={busy || name.trim().length < 2} onClick={() => void submit()} className="text-[14px] text-ap-blue disabled:opacity-50">
            {busy ? "Sending…" : "Request mood"}
          </button>
        </div>
      )}
    </div>
  );
}
