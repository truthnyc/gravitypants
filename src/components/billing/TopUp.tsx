import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createTopUpSession } from "@/lib/stillframe/billing.functions";
import { currentWorkspaceId } from "@/lib/stillframe/billing";

function TopUpCheckout({ workspaceId }: { workspaceId: string }) {
  const create = useServerFn(createTopUpSession);
  const fetchClientSecret = async () => {
    const r = await create({
      data: { workspaceId, returnUrl: `${window.location.origin}/account/billing?checkout=success`, environment: getStripeEnvironment() },
    });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  };
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
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
          <DialogTitle className="sr-only">Buy extra exports</DialogTitle>
          {open && <TopUpCheckout workspaceId={open} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
