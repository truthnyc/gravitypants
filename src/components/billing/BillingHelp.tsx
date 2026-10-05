import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { diagnoseBilling } from "@/lib/stillframe/billing-help.functions";
import { currentWorkspaceId } from "@/lib/stillframe/billing";
import { getStripeEnvironment } from "@/lib/stripe";

/** Owners describe a billing problem and get a likely cause plus a next step. */
export function BillingHelp() {
  const ask = useServerFn(diagnoseBilling);
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setAnswer(null);
    setError(null);
    try {
      const ws = await currentWorkspaceId();
      if (!ws) throw new Error("Please sign in again.");
      const r = await ask({ data: { workspaceId: ws, issue, environment: getStripeEnvironment() } });
      if ("error" in r) setError(r.error);
      else setAnswer(r.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="acct-card">
      <h2 className="text-[17px] font-semibold">Something wrong with billing?</h2>
      <p className="mt-1 text-[14px] text-secondary-text">Tell us what happened. We'll look at your plan and suggest what to do next.</p>
      <Textarea
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        maxLength={1500}
        placeholder="For example: I switched to Team but it still says Business."
        className="mt-4 min-h-[96px] text-[16px] sm:text-[14px]"
        aria-label="Describe the billing problem"
      />
      <div className="mt-3 flex gap-2">
        <Button onClick={() => void submit()} disabled={busy || issue.trim().length < 5} className="h-11 sm:h-10">
          {busy ? "Looking into it…" : "Get Help"}
        </Button>
      </div>
      {answer && (
        <div role="status" className="mt-4 whitespace-pre-line rounded-sm bg-control-fill p-4 text-[14px] leading-relaxed">
          {answer}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-[14px] text-destructive">{error}</p>}
    </section>
  );
}
