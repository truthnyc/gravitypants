import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/stillframe/billing.functions";

export type CheckoutTarget = { priceId: string; ws: string };

function Checkout({ priceId, workspaceId }: { priceId: string; workspaceId: string }) {
  const create = useServerFn(createCheckoutSession);
  const fetchClientSecret = async () => {
    const r = await create({
      data: { priceId, workspaceId, returnUrl: `${window.location.origin}/app/account/billing?checkout=success`, environment: getStripeEnvironment() },
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

/** Embedded Stripe checkout in a dialog. Paying switches the workspace to the new plan right away. */
export function CheckoutDialog({ checkout, onClose }: { checkout: CheckoutTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!checkout} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
        <DialogTitle className="sr-only">Pay for your plan</DialogTitle>
        {checkout && <Checkout priceId={checkout.priceId} workspaceId={checkout.ws} />}
      </DialogContent>
    </Dialog>
  );
}
