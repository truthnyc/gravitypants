import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { TopUpCard } from "@/components/billing/TopUp";
import { BillingHelp } from "@/components/billing/BillingHelp";
import { type ExportStatus, isPaid, money, planName, statusLine, useBilling, useExportStatus, useManageBilling, usePlans, useRefreshBilling } from "@/lib/stillframe/billing";
import { useMyWorkspaces } from "@/components/stillframe/WorkspaceSwitcher";
import { peekWorkspaceId } from "@/lib/stillframe/workspace";

export const Route = createFileRoute("/_authenticated/app/account_/billing")({
  validateSearch: z.object({ checkout: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Billing — Gravity Pants" },
      { name: "description", content: "Your Gravity Pants plan, exports this month and billing details." },
      { property: "og:title", content: "Billing — Gravity Pants" },
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
  const [thanks, setThanks] = useState(false);

  // After paying, the plan arrives a moment later — check a few times.
  useEffect(() => {
    if (checkout !== "success") return;
    setThanks(true);
    void navigate({ to: "/app/account/billing", search: {}, replace: true });
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
  const { data: myWorkspaces } = useMyWorkspaces();
  const myRole = myWorkspaces?.find((w) => w.id === peekWorkspaceId())?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Account</h1>
      <AccountTabs />

      {thanks && (
        <section role="status" className="rounded-sm bg-card p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">Thank you for choosing Gravity Pants</h2>
          <p className="mt-1 text-[14px] text-secondary-text">
            Your plan is active and exporting is unlocked. A receipt is on its way to your inbox.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/app/ads">Go to Your Ads</Link></Button>
            <Button variant="plain" onClick={() => setThanks(false)}>Close</Button>
          </div>
        </section>
      )}

      <section className="rounded-sm bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">{billing ? planName(billing.plan) : " "}</h2>
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
        {billing?.inherited && (
          <p className="mt-2 text-[13px] text-secondary-text">
            Covered by your plan on “{billing.source_workspace_name}”. Exports are shared across all your workspaces.
          </p>
        )}


        {billing && (
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
            <dt className="text-secondary-text">Plan</dt>
            <dd className="font-medium">{planName(billing.plan)}</dd>
            <dt className="text-secondary-text">{paid ? (billing.cancel_at_period_end || billing.status === "canceled" ? "Ends on" : "Renews on") : "Trial ends"}</dt>
            <dd className="nums">{longDate(paid ? billing.current_period_end : billing.trial_ends_at)}</dd>
            <dt className="text-secondary-text">Exports left</dt>
            <dd className="nums">{exportsLeft(status)}</dd>
          </dl>
        )}

        {status?.limit != null && (
          <div className="mt-5">
            <p className="text-[14px] nums">
              {status.used ?? 0} of {status.limit} exports used {limited ? "this month" : "in your trial"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-control-fill">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((status.used ?? 0) / (status.limit || 1)) * 100)}%` }} />
            </div>
            {limited && status.resets_at && (
              <p className="mt-1.5 text-[12px] text-secondary-text nums">Resets on {longDate(status.resets_at)}</p>
            )}
          </div>
        )}

        {canManage ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant={paid ? "plain" : "default"}>
              <Link to="/pricing">{paid ? "Change Plan" : "Pick a Plan"}</Link>
            </Button>
            {billing?.stripe_customer_id && (
              <Button variant="plain" onClick={() => void manage().then(() => refetch())}>
                Manage Billing
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-6 text-[13px] text-secondary-text">Only the workspace owner or an admin can change the plan or billing.</p>
        )}
      </section>

      {canManage && <TopUpCard extras={status?.extras ?? billing?.extra_exports} />}
      {canManage && <BillingHelp />}
    </main>
  );
}

function longDate(s: string | null | undefined) {
  return s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "—";
}

function exportsLeft(st: ExportStatus | null | undefined): string {
  if (!st) return "—";
  const extras = st.extras ?? 0;
  const extra = extras > 0 ? ` + ${extras} extra` : "";
  if (st.limit == null) return st.allowed ? `Unlimited${extra}` : extras > 0 ? `${extras} extra` : "None — pick a plan";
  return `${Math.max(0, st.limit - (st.used ?? 0))} of ${st.limit}${extra}`;
}
