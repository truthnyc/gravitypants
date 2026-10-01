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
  const [thanks, setThanks] = useState<"plan" | "pack" | false>(false);

  // After paying, the plan arrives a moment later — check a few times.
  useEffect(() => {
    if (checkout !== "success" && checkout !== "pack") return;
    setThanks(checkout === "pack" ? "pack" : "plan");
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
          <h2 className="text-[17px] font-semibold">{thanks === "pack" ? "Extra exports added" : "Thank you for choosing Gravity Pants"}</h2>
          <p className="mt-1 text-[14px] text-secondary-text nums">
            {thanks === "pack"
              ? `Payment received. You now have ${status?.extras ?? 0} extra exports, shown below. They never expire.`
              : "Your plan is active and exporting is unlocked. A receipt is on its way to your inbox."}
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
            {paid && (
              <>
                <dt className="text-secondary-text">{billing.cancel_at_period_end || billing.status === "canceled" ? "Ends on" : "Renews on"}</dt>
                <dd className="nums">{longDate(billing.current_period_end)}</dd>
              </>
            )}
          </dl>
        )}

        {status && <ExportCounts st={{ ...status, extras: status.extras ?? billing?.extra_exports ?? 0 }} monthly={limited} />}

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

/** Clear numbers: exports left in total, used this period, and extra exports on hand. */
function ExportCounts({ st, monthly }: { st: ExportStatus; monthly: boolean }) {
  const extras = st.extras ?? 0;
  const used = st.used ?? 0;
  const planLeft = st.limit != null ? Math.max(0, st.limit - used) : null;
  const total = planLeft != null ? planLeft + extras : null;
  const cell = (label: string, value: string, note?: string) => (
    <div className="rounded-sm bg-control-fill p-3">
      <p className="text-[12px] text-secondary-text">{label}</p>
      <p className="mt-0.5 text-[22px] font-semibold nums">{value}</p>
      {note && <p className="text-[12px] text-secondary-text nums">{note}</p>}
    </div>
  );
  return (
    <div className="mt-5">
      <div className="grid grid-cols-3 gap-2">
        {cell("Exports left", total != null ? String(total) : st.allowed ? "Unlimited" : String(extras), total != null && extras > 0 ? `${planLeft} plan + ${extras} extra` : undefined)}
        {cell(monthly ? "Used this month" : "Used", st.limit != null ? `${used} of ${st.limit}` : String(used))}
        {cell("Extra exports", String(extras), "Never expire")}
      </div>
      {st.limit != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (used / (st.limit || 1)) * 100)}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-[12px] text-secondary-text nums">
        {monthly && st.resets_at ? `Plan exports reset on ${longDate(st.resets_at)}. Extra exports are used only after those run out.` : st.trial ? (st.watermark ? "Trial exports carry a watermark." : "Your next export has no watermark.") : "Extra exports are used only after your plan exports run out."}
      </p>
    </div>
  );
}
