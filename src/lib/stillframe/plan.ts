import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { peekWorkspaceId } from "./workspace";
import { billingKey, fetchExportStatus, type ExportStatus } from "./billing";
import { TRIAL } from "./plans-config";

/** Every plan-gated feature. Add new gates here so the whole app checks plans in one place. */
export type Feature = "export" | "gif" | "brand_kits" | "templates" | "team_sharing" | "priority_support";

/** Free trial limit, from the shared plan config (also enforced in SQL export_status). */
export const FREE_EXPORTS = TRIAL.exports;

export type Entitlements = { paid: boolean; team: boolean; exports: ExportStatus | null };

export function canUseWith(e: Entitlements | undefined, f: Feature): boolean {
  if (!e) return true; // still loading: never block; the server re-checks anyway
  switch (f) {
    case "export":
      return e.exports?.allowed ?? true;
    case "gif":
    case "brand_kits":
    case "templates":
      return e.paid;
    case "team_sharing":
    case "priority_support":
      return e.team;
  }
}

/** Plan checks for the active workspace. Server/RLS enforce the same rules; this only drives the UI. */
export function usePlanAccess() {
  const wsId = peekWorkspaceId();
  const q = useQuery({
    queryKey: [...billingKey, "entitlements", wsId],
    enabled: !!wsId,
    queryFn: async (): Promise<Entitlements> => {
      const ws = wsId as string;
      const [{ data: paid }, { data: team }, exports] = await Promise.all([
        supabase.rpc("brand_kits_enabled", { _ws: ws }),
        supabase.rpc("workspace_is_team", { _ws: ws }),
        fetchExportStatus().catch(() => null),
      ]);
      return { paid: Boolean(paid), team: Boolean(team), exports };
    },
    refetchOnWindowFocus: "always",
  });
  return { ...q, canUse: (f: Feature) => canUseWith(q.data, f) };
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
