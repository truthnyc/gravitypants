import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStripeEnvironment } from "@/lib/stripe";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { getStorageUsage, setStorageAddon } from "@/lib/stillframe/storage.functions";
import { STORAGE_ADDON, formatGB } from "@/lib/stillframe/storage-limits";

export function useStorageUsage() {
  const get = useServerFn(getStorageUsage);
  return useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => get({ data: { workspaceId: await getWorkspaceId() } }),
  });
}

/** Storage meter with the two ways to get room: add storage monthly, or free up space. */
export function StorageCard({ canManage }: { canManage: boolean }) {
  const { data } = useStorageUsage();
  const set = useServerFn(setStorageAddon);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const pct = Math.min(100, Math.round((data.used / (data.limit || 1)) * 100));
  const change = async (units: number) => {
    setBusy(true);
    try {
      const r = await set({ data: { workspaceId: await getWorkspaceId(), units, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      toast.success(units === 0 ? "Extra storage removed." : "Storage updated. It can take a moment to show.");
      setTimeout(() => void qc.invalidateQueries({ queryKey: ["storage-usage"] }), 2500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change storage.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="storage" className="acct-card">
      <h2 className="text-[17px] font-semibold">Storage</h2>
      <p className="mt-1 text-[14px] text-secondary-text nums">
        {formatGB(data.used)} of {formatGB(data.limit)} used
        {data.addonUnits > 0 && ` · includes ${data.addonUnits * STORAGE_ADDON.gb} GB extra`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full ${pct >= 80 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="plain"><Link to="/app/storage">Free up space</Link></Button>
        {canManage && (data.paid ? (
          <>
            <Button disabled={busy || data.addonUnits >= STORAGE_ADDON.max} onClick={() => void change(data.addonUnits + 1)}>
              Add {STORAGE_ADDON.gb} GB · ${STORAGE_ADDON.price}/month
            </Button>
            {data.addonUnits > 0 && (
              <Button variant="plain" disabled={busy} onClick={() => void change(data.addonUnits - 1)}>Remove {STORAGE_ADDON.gb} GB</Button>
            )}
          </>
        ) : (
          <Button asChild><Link to="/pricing">Upgrade to add storage</Link></Button>
        ))}
      </div>
      {canManage && data.paid && (
        <p className="mt-2 text-[12px] text-secondary-text">Added to your plan's monthly bill, prorated. Remove anytime.</p>
      )}
    </section>
  );
}
