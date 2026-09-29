import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createTopUpSession } from "@/lib/stillframe/billing.functions";
import { currentWorkspaceId } from "@/lib/stillframe/billing";

function TopUpCheckout({ workspaceId }: { workspaceId: string }) {
  const create = useServerFn(createTopUpSession);
  const [state, setState] = useState<{ secret?: string; error?: string; loading: boolean }>({ loading: true });
  const load = useCallback(async () => {
    setState({ loading: true });
    try {
      const r = await create({
        data: { workspaceId, returnUrl: `${window.location.origin}/app/account/billing?checkout=success`, environment: getStripeEnvironment() },
      });
      if ("error" in r) setState({ loading: false, error: r.error });
      else setState({ loading: false, secret: r.clientSecret });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : "Checkout couldn't load." });
    }
  }, [create, workspaceId]);
  useEffect(() => { void load(); }, [load]);
  if (state.loading) return <p className="py-10 text-center text-[14px] text-secondary-text">Loading checkout…</p>;
  if (state.error || !state.secret) {
    return (
      <div className="py-8 text-center">
        <p className="text-[14px] text-destructive">{state.error ?? "Checkout couldn't load."}</p>
        <Button className="mt-4" variant="plain" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }
  const secret = state.secret;
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => secret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

/** One-time pack of 5 extra exports that never expire. */
export function TopUpCard({ extras }: { extras?: number | undefined }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="rounded-sm bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">Need more exports?</h2>
          <p className="mt-1 text-[14px] text-secondary-text">
            5 extra exports for $12.50 — they never expire and work on any plan.
            {extras != null && extras > 0 && <span className="nums"> You have {extras} left.</span>}
          </p>
        </div>
        <Button
          variant="plain"
          onClick={async () => {
            const ws = await currentWorkspaceId();
            if (ws) setOpen(ws);
          }}
        >
          Buy 5 Exports
        </Button>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
          <DialogTitle className="text-[17px] font-semibold">Buy 5 extra exports · <span className="nums">$12.50</span></DialogTitle>
          {open && <TopUpCheckout workspaceId={open} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
