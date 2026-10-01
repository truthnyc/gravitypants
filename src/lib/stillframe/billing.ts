import { peekWorkspaceId } from "./workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "./billing.functions";

export type Plan = { id: string; name: string; price_id: string; amount_cents: number; interval: string; monthly_exports: number | null; sort_order: number; seats?: number };
export type Billing = {
  workspace_id: string;
  plan: "trial" | "simple" | "simple_yearly" | "business" | "business_yearly" | "team" | "team_yearly" | "none";
  status: "trialing" | "active" | "past_due" | "canceled";
  trial_ends_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  extra_exports?: number;
  /** Set when this workspace runs on a plan paid for by another workspace of the same owner. */
  inherited?: boolean;
  source_workspace_id?: string;
  source_workspace_name?: string | null;
};

export type ExportStatus = { allowed: boolean; reason: "no_plan" | "limit_reached" | "payment_problem" | "no_access" | null; used?: number; limit?: number; resets_at?: string | null; watermark?: boolean; trial?: boolean; clean_left?: number; extras?: number };

export const billingKey = ["billing"] as const;

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

/** Workspace id for the signed-in user, or null when signed out. Works on public pages too. */
export async function currentWorkspaceId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  // Billing follows the workspace the user is working in (workspace switcher), not just their first one.
  const active = peekWorkspaceId();
  if (active) return active;
  const { data: ws } = await supabase.rpc("ensure_workspace");
  return (ws as string) ?? null;
}

export function useBilling() {
  return useQuery({
    queryKey: [...billingKey, "row"],
    queryFn: async () => {
      const ws = await currentWorkspaceId();
      if (!ws) return null;
      // The plan a workspace runs on: its own, or the one its owner already pays for elsewhere.
      const { data } = await supabase.rpc("effective_billing" as never, { _ws: ws } as never);
      return (data as unknown as Billing | null) ?? null;

    },
    // Coming back from Manage Billing (another tab) shows the new plan right away.
    refetchOnWindowFocus: "always",
  });
}

export function useExportStatus() {
  return useQuery({
    queryKey: [...billingKey, "export", peekWorkspaceId()],
    queryFn: fetchExportStatus,
    refetchOnWindowFocus: "always",
  });
}

export async function fetchExportStatus(): Promise<ExportStatus> {
  const ws = await currentWorkspaceId();
  if (!ws) return { allowed: false, reason: "no_access" };
  const { data, error } = await supabase.rpc("export_status", { _ws: ws });
  if (error) throw error;
  return data as unknown as ExportStatus;
}

export const isPaid = (b: Billing | null | undefined) =>
  !!b && b.plan !== "trial" && b.plan !== "none" && (b.status !== "canceled" || (!!b.current_period_end && new Date(b.current_period_end) > new Date()));

export const trialDaysLeft = (b: Billing) => Math.max(0, Math.ceil((new Date(b.trial_ends_at).getTime() - Date.now()) / 86400000));

const shortDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

export function planName(id: string) {
  return id === "simple"
    ? "Simple"
    : id === "simple_yearly"
      ? "Simple Yearly"
    : id === "business"
      ? "Business"
      : id === "business_yearly"
        ? "Business Yearly"
        : id === "team"
          ? "Team"
          : id === "team_yearly"
            ? "Team Yearly"
            : id === "trial"
              ? "Free trial"
              : "No plan";
}

export function statusLine(b: Billing): string {
  if (!isPaid(b)) {
    const d = trialDaysLeft(b);
    return d > 0 ? `Free trial · ${d} ${d === 1 ? "day" : "days"} left` : "Free trial ended · pick a plan to export";
  }
  if (b.status === "past_due") return "Payment problem — update your card";
  if (b.cancel_at_period_end || b.status === "canceled") return `Cancels on ${shortDate(b.current_period_end)}`;
  return `${planName(b.plan)} · renews ${shortDate(b.current_period_end)}`;
}

export function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function useManageBilling() {
  const portal = useServerFn(createPortalSession);
  return async () => {
    // Open the tab before any await so pop-up blockers allow it.
    const tab = window.open("", "_blank");
    if (tab) tab.document.title = "Opening billing…";
    const ws = await currentWorkspaceId();
    if (!ws) { tab?.close(); return; }
    try {
       const r = await portal({ data: { workspaceId: ws, returnUrl: `${window.location.origin}/app/account/billing`, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      if (tab) tab.location.href = r.url;
      else (window.top ?? window).location.href = r.url;
    } catch (e) {
      tab?.close();
      toast.error(e instanceof Error ? e.message : "Couldn't open billing.");
    }
  };
}

export function useRefreshBilling() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: billingKey });
}
