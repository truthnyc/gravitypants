import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createTopUpSession } from "@/lib/stillframe/billing.functions";
import { currentWorkspaceId } from "@/lib/stillframe/billing";
import { EXPORT_PACKS } from "@/lib/stillframe/plans-config";

type Pack = (typeof EXPORT_PACKS)[number];

function TopUpCheckout({ workspaceId, packId }: { workspaceId: string; packId: string }) {
  const create = useServerFn(createTopUpSession);
  const [state, setState] = useState<{ secret?: string; error?: string; loading: boolean }>({ loading: true });
  const load = useCallback(async () => {
    setState({ loading: true });
    try {
      const r = await create({
        data: { workspaceId, packId, returnUrl: `${window.location.origin}/app/account/billing?checkout=success`, environment: getStripeEnvironment() },
      });
      if ("error" in r) setState({ loading: false, error: r.error });
      else setState({ loading: false, secret: r.clientSecret });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : "Checkout couldn't load." });
    }
  }, [create, workspaceId, packId]);
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

/** One-time packs of extra exports that never expire, usable on any plan. */
export function TopUpCard({ extras }: { extras?: number | undefined }) {
  const [open, setOpen] = useState<{ ws: string; pack: Pack } | null>(null);
  return (
    <section className="rounded-sm bg-card p-6 shadow-card">
      <h2 className="text-[17px] font-semibold">Need more exports?</h2>
      <p className="mt-1 text-[14px] text-secondary-text">
        Extra exports never expire and work on any plan.
        {extras != null && extras > 0 && <span className="nums"> You have {extras} left.</span>}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {EXPORT_PACKS.map((pack) => (
          <Button
            key={pack.id}
            variant="plain"
            className="nums"
            onClick={async () => {
              const ws = await currentWorkspaceId();
              if (ws) setOpen({ ws, pack });
            }}
          >
            {pack.exports} Exports · ${pack.price}
          </Button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
          {open && (
            <>
              <DialogTitle className="text-[17px] font-semibold">Buy {open.pack.exports} extra exports · <span className="nums">${open.pack.price}</span></DialogTitle>
              <TopUpCheckout key={open.pack.id} workspaceId={open.ws} packId={open.pack.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
