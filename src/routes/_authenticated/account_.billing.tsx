import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { isPaid, money, planName, statusLine, useBilling, useExportStatus, useManageBilling, usePlans, useRefreshBilling } from "@/lib/stillframe/billing";

export const Route = createFileRoute("/_authenticated/account_/billing")({
  validateSearch: z.object({ checkout: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Billing — Stillframe" },
      { name: "description", content: "Your Stillframe plan, exports this month and billing details." },
      { property: "og:title", content: "Billing — Stillframe" },
      { property: "og:description", content: "Your plan, usage and billing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { checkout } = Route.useSearch();
  const navigate = useNavigate();
  const { data: billing, refetch } = useBilling();
  const { data: status } = useExportStatus();
  const { data: plans } = usePlans();
  const manage = useManageBilling();
  const refresh = useRefreshBilling();

  // After paying, the plan arrives a moment later — check a few times.
  useEffect(() => {
    if (checkout !== "success") return;
    toast.success("Thanks — your plan is ready.");
    void navigate({ to: "/account/billing", search: {}, replace: true });
    let n = 0;
    const t = setInterval(() => {
      n++;
      void refresh();
      if (n >= 8) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }, [checkout]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = plans?.find((p) => p.id === billing?.plan);
  const paid = isPaid(billing);
  const limited = paid && status?.limit != null;

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-8 py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Account</h1>
      <AccountTabs />

      <section className="rounded-sm bg-card p-6 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">{billing ? (paid ? planName(billing.plan) : "Free trial") : " "}</h2>
          {paid && plan && (
            <span className="text-[15px] font-semibold nums">
              {money(plan.amount_cents)} <span className="font-normal text-secondary-text">/ {plan.interval}</span>
            </span>
          )}
        </div>
        {billing && (
          <p className={billing.status === "past_due" && paid ? "mt-1 text-[14px] text-destructive" : "mt-1 text-[14px] text-secondary-text nums"}>
            {statusLine(billing)}
          </p>
        )}

        {limited && status && (
          <div className="mt-5">
            <p className="text-[14px] nums">
              {status.used} of {status.limit} exports used this month
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-control-fill">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((status.used ?? 0) / (status.limit || 1)) * 100)}%` }} />
            </div>
            {status.resets_at && (
              <p className="mt-1.5 text-[12px] text-secondary-text nums">
                Resets on {new Date(status.resets_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button asChild variant={paid ? "plain" : "default"}>
            <Link to="/pricing">{paid ? "Change Plan" : "Pick a Plan"}</Link>
          </Button>
          {billing?.stripe_customer_id && (
            <Button variant="plain" onClick={() => void manage().then(() => refetch())}>
              Manage Billing
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
