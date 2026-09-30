import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { isPaid, trialDaysLeft, useBilling, useManageBilling } from "@/lib/stillframe/billing";

const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

/** Test-mode note; hidden once real payments are live. */
export function PaymentTestModeBanner() {
  if (clientToken?.startsWith("pk_live_")) return null;
  return (
    <div className="w-full bg-warning-soft px-4 py-1.5 text-center text-[12px] text-foreground hairline-b">
      {clientToken ? "Payments in the preview are in test mode." : "Real payments aren't set up yet."}{" "}
      <a href="https://docs.lovable.dev/features/payments#test-and-live-environments" target="_blank" rel="noopener noreferrer" className="text-link underline">
        Read about test and live payments
      </a>
    </div>
  );
}

export function PaymentProblemBanner() {
  const { data: b } = useBilling();
  const manage = useManageBilling();
  if (!b || b.status !== "past_due" || !isPaid(b)) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-3 bg-card px-4 py-1.5 text-[13px] hairline-b">
      <span className="text-destructive">We couldn't take your last payment. Update your card</span>
      <Button size="sm" variant="plain" onClick={() => void manage()}>Manage Billing</Button>
    </div>
  );
}

export function TrialPill() {
  const { data: b } = useBilling();
  if (!b || isPaid(b)) return null;
  const d = trialDaysLeft(b);
  return (
    <Link to="/pricing" className="rounded-lg bg-control-fill px-2.5 py-1 text-[12px] font-medium text-secondary-text nums hover:text-foreground">
      {d > 0 ? `Trial · ${d} ${d === 1 ? "day" : "days"} left` : "Trial ended"}
    </Link>
  );
}
