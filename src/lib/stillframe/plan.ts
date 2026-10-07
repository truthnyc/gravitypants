import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { peekWorkspaceId } from "./workspace";
import { billingKey, fetchExportStatus, type ExportStatus } from "./billing";
import { TRIAL } from "./plans-config";

/** Every plan-gated feature. Add new gates here so the whole app checks plans in one place. */
export type Feature = "export" | "gif" | "brand_kits" | "templates" | "team_sharing" | "priority_support" | "brand_stats";

/** Free trial limit, from the shared plan config (also enforced in SQL export_status). */
export const FREE_EXPORTS = TRIAL.exports;

export type Entitlements = { paid: boolean; team: boolean; exports: ExportStatus | null; tier?: string | null; admin?: boolean; trial?: boolean };

/** Plan family ("simple" | "business" | "team") that the active workspace is paying for, or null. */
export function planTier(b: { plan?: string; status?: string; comp_plan?: string | null; comp_until?: string | null; current_period_end?: string | null } | null): string | null {
  if (!b) return null;
  if (b.comp_plan && b.comp_until && new Date(b.comp_until) > new Date()) return b.comp_plan.replace(/_yearly$/, "");
  const live = b.status !== "canceled" || (b.current_period_end && new Date(b.current_period_end) > new Date());
  const p = (b.plan ?? "").replace(/_yearly$/, "");
  return live && ["simple", "business", "team"].includes(p) ? p : null;
}

/** Active free trial (no paid plan yet). */
export function isTrial(b: { plan?: string; status?: string; trial_ends_at?: string | null } | null): boolean {
  return !!b && b.plan === "trial" && b.status === "trialing"; // no time limit: the trial lasts until its exports are used
}

/** Ready-made templates can be limited to plans; an empty audience means everyone. */
export function canUseAudience(e: Entitlements | undefined, audience: string[] | null | undefined): boolean {
  if (!audience?.length || !e) return true;
  // Free-trial accounts get every feature, so plan-limited templates are open to them too.
  return Boolean(e.admin) || Boolean(e.trial) || (e.tier != null && audience.includes(e.tier));
}

export function canUseWith(e: Entitlements | undefined, f: Feature): boolean {
  if (!e) return true; // still loading: never block; the server re-checks anyway
  switch (f) {
    case "export":
      return e.exports?.allowed ?? true;
    case "gif":
    case "brand_kits":
    case "templates":
      return e.paid || Boolean(e.trial);
    case "team_sharing":
    case "priority_support":
      return e.team;
    case "brand_stats":
      return Boolean(e.admin) || e.tier === "business" || e.tier === "team";
  }
}

/** Plan checks for the active workspace. Server/RLS enforce the same rules; this only drives the UI.
 *  Pass a workspace id on pages the sign-in gate never runs on (public site pages); it falls back to the active workspace. */
export function usePlanAccess(wsOverride?: string | null) {
  const wsId = wsOverride ?? peekWorkspaceId();
  const q = useQuery({
    queryKey: [...billingKey, "entitlements", wsId],
    enabled: !!wsId,
    queryFn: async (): Promise<Entitlements> => {
      const ws = wsId as string;
      const [{ data: paid }, { data: team }, exports, { data: billing }, { data: admin }] = await Promise.all([
        supabase.rpc("brand_kits_enabled", { _ws: ws }),
        supabase.rpc("workspace_is_team", { _ws: ws }),
        fetchExportStatus().catch(() => null),
        supabase.rpc("effective_billing", { _ws: ws }),
        supabase.rpc("is_platform_admin"),
      ]);
      return { paid: Boolean(paid), team: Boolean(team), exports, tier: planTier(billing as never), admin: Boolean(admin), trial: isTrial(billing as never) };
    },
    refetchOnWindowFocus: "always",
  });
  return { ...q, canUse: (f: Feature) => canUseWith(q.data, f), canUseTemplate: (audience: string[] | null | undefined) => canUseAudience(q.data, audience) };
}

/* Upgrade dialog store: any screen can call openUpgrade(feature). */
let upgradeFeature: Feature | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());
export function openUpgrade(f: Feature) {
  upgradeFeature = f;
  emit();
}
export function closeUpgrade() {
  upgradeFeature = null;
  emit();
}
export function useUpgradeFeature() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => upgradeFeature,
    () => null,
  );
}

/** Runs `fn` when allowed, otherwise opens the upgrade dialog. */
export function guard(allowed: boolean, f: Feature, fn: () => void) {
  if (allowed) fn();
  else openUpgrade(f);
}
