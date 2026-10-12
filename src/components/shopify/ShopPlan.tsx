import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OUTSIDE_ADMIN_MESSAGE, shopifyFetch } from "@/lib/shopify/bridge";

export type ExportStatus = { allowed?: boolean; reason?: string | null; used?: number; limit?: number; trial?: boolean; watermark?: boolean; staff?: boolean };
export type PlanInfo = { status: ExportStatus | null; plan: { source: "web" | "shopify"; handle: string; name: string; period: string | null; configured: boolean } };

export function useShopPlan() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const refresh = useCallback(() => shopifyFetch<PlanInfo>("/api/public/shopify/export", { action: "status" }).then(setInfo).catch(() => undefined), []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { info, refresh };
}

export type WelcomeInfo = PlanInfo & { returnTo: string | null };

/** Immediate (uncached) subscription re-check after Shopify returns the merchant from the hosted plan page. */
export function usePlanWelcome(run: boolean) {
  const [info, setInfo] = useState<WelcomeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    shopifyFetch<WelcomeInfo>("/api/public/shopify/export", { action: "welcome" })
      .then((r) => { if (!cancelled) setInfo(r); })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [run]);
  return { info, error };
}

export const OUTSIDE_ADMIN_MESSAGE = "Gravity Pants for Shopify runs inside your Shopify admin. Open it from Apps in your store.";

/** Shown when a /shopify page is opened outside the Shopify admin (App Bridge missing). */
export function OutsideAdmin() {
  return (
    <>
      <p role="alert" className="mt-2 text-sm text-destructive">{OUTSIDE_ADMIN_MESSAGE}</p>
      <a href="https://gravitypants.com" className="mt-3 inline-block text-sm text-primary underline">gravitypants.com</a>
    </>
  );
}

export function remainingText(s: ExportStatus | null) {
  if (!s) return "";
  if (s.staff || s.limit == null) return "Unlimited exports";
  const left = Math.max((s.limit ?? 0) - (s.used ?? 0), 0);
  return s.trial ? `${left} of ${s.limit} exports left` : `${left} of ${s.limit} exports left this month`;
}

/** Opens Shopify's hosted plan page at the top level, outside the app iframe. */
export function UpgradeButton({ returnTo, label = "Upgrade", cta = "shopify-upgrade", variant = "default" }: { returnTo?: string | undefined; label?: string; cta?: string; variant?: "default" | "outline" | "link" }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    setMsg(null);
    try {
      const { url } = await shopifyFetch<{ url: string }>("/api/public/shopify/export", { action: "upgrade", returnTo });
      window.open(url, "_top");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant={variant} data-cta={cta} onClick={go}>{label}</Button>
      {msg && <span role="status" className="text-xs text-muted-foreground">{msg}</span>}
    </span>
  );
}

export function PlanBar({ info, returnTo }: { info: PlanInfo | null; returnTo?: string | undefined }) {
  if (!info) return null;
  const paidShopify = info.plan.source === "shopify" && info.plan.handle !== "free";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-border p-3 text-sm">
      <span>Plan: <b>{info.plan.source === "web" ? "Gravity Pants account" : info.plan.name}</b></span>
      <span className="text-muted-foreground tabular-nums">{remainingText(info.status)}</span>
      {info.plan.source === "shopify" && !paidShopify && <UpgradeButton returnTo={returnTo} />}
      {paidShopify && <UpgradeButton returnTo={returnTo} label="Change plan" variant="outline" cta="shopify-change-plan" />}
    </div>
  );
}
