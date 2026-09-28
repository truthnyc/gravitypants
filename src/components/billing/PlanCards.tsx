import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/stillframe/billing.functions";
import { currentWorkspaceId, isPaid, money, useBilling, useManageBilling, usePlans, type Plan } from "@/lib/stillframe/billing";
import { cn } from "@/lib/utils";

const FEATURE: Record<string, string[]> = {
  simple: ["10 exports every month", "1 seat"],
  business: ["50 exports every month", "1 seat"],
  business_yearly: ["50 exports every month", "1 seat"],
  team: ["150 shared exports every month", "3 seats", "Shared brand kits and templates", "Priority support"],
  team_yearly: ["150 shared exports every month", "3 seats", "Shared brand kits and templates", "Priority support"],
};
const CTA: Record<string, { label: string; variant: "plain" | "default" }> = {
  simple: { label: "Choose Simple", variant: "plain" },
  business: { label: "Choose Business", variant: "default" },
  business_yearly: { label: "Choose Yearly", variant: "plain" },
  team: { label: "Choose Team", variant: "plain" },
  team_yearly: { label: "Choose Team Yearly", variant: "plain" },
};

function Checkout({ priceId, workspaceId }: { priceId: string; workspaceId: string }) {
  const create = useServerFn(createCheckoutSession);
  const fetchClientSecret = async () => {
    const r = await create({
      data: { priceId, workspaceId, returnUrl: `${window.location.origin}/account/billing?checkout=success`, environment: getStripeEnvironment() },
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

export function PlanCards({ compact = false }: { compact?: boolean }) {
  const { data: plans } = usePlans();
  const { data: billing } = useBilling();
  const navigate = useNavigate();
  const manage = useManageBilling();
  const [checkout, setCheckout] = useState<{ priceId: string; ws: string } | null>(null);
  const paid = isPaid(billing);

  async function choose(p: Plan) {
    // Switching plans happens in Manage Billing; call it first so the new tab isn't blocked.
    if (paid) return void manage();
    const ws = await currentWorkspaceId();
    if (!ws) {
      void navigate({ to: "/signup", search: { redirect: "/pricing" } });
      return;
    }
    setCheckout({ priceId: p.price_id, ws });
  }

  return (
    <>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3", compact ? "gap-3" : "gap-5")}>
        {(plans ?? []).map((p) => {
          const current = paid && billing?.plan === p.id;
          const cta = CTA[p.id] ?? { label: `Choose ${p.name}`, variant: "plain" as const };
          return (
            <div key={p.id} className={cn("flex flex-col rounded-sm bg-card shadow-card", compact ? "p-5" : "p-5 sm:p-7")}>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-semibold">{p.name}</h3>
                {p.interval === "year" && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-text">2 months free</span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className={cn("font-bold tracking-[-0.02em] nums", compact ? "text-[34px]" : "text-[44px]")}>{money(p.amount_cents)}</span>
                <span className="text-[14px] text-secondary-text">/ {p.interval}</span>
              </div>
              <div className="my-4 hairline-b" />
              <div className="space-y-2">
                {(FEATURE[p.id] ?? []).map((f) => (
                  <p key={f} className="flex items-center gap-2 text-[14px]">
                    <Check className="size-4 shrink-0 text-primary" strokeWidth={1.7} />
                    {f}
                  </p>
                ))}
              </div>
              <div className="flex-1" />
              <Button
                variant={current ? "plain" : cta.variant}
                disabled={current}
                className="mt-6 h-10 w-full"
                onClick={() => void choose(p)}
              >
                {current ? "Current Plan" : cta.label}
              </Button>
            </div>
          );
        })}
      </div>
      <Dialog open={!!checkout} onOpenChange={(o) => !o && setCheckout(null)}>
        <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
          <DialogTitle className="sr-only">Pay for your plan</DialogTitle>
          {checkout && <Checkout priceId={checkout.priceId} workspaceId={checkout.ws} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
