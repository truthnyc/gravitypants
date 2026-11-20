import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { planTier } from "./plan";
import { STORAGE_ADDON, storageLimitFor } from "./storage-limits";

const uuid = /^[0-9a-f-]{36}$/i;
/* eslint-disable @typescript-eslint/no-explicit-any */

export type StorageFile = { name: string; bytes: number; created_at: string; kind: string; in_use: boolean };
export type StorageUsage = { used: number; limit: number; addonUnits: number; paid: boolean; files: StorageFile[] };

async function payerFor(supabase: any, ws: string): Promise<string> {
  const { data } = await supabase.rpc("billing_source", { _ws: ws });
  return (data as string | null) ?? ws;
}

/** Storage used, the plan's limit (including add-ons) and the workspace's files, largest first. */
export const getStorageUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => {
    if (!uuid.test(d.workspaceId)) throw new Error("Invalid input");
    return d;
  })
  .handler(async ({ data, context }): Promise<StorageUsage> => {
    const sb = context.supabase as any;
    const [{ data: files, error }, { data: eff }] = await Promise.all([
      sb.rpc("workspace_storage_files", { _ws: data.workspaceId }),
      sb.rpc("effective_billing", { _ws: data.workspaceId }),
    ]);
    if (error) { console.error("workspace_storage_files", error); throw new Error("Couldn't read storage."); }
    const tier = planTier(eff as never);
    const payer = await payerFor(sb, data.workspaceId);
    const { data: wb } = await sb.from("workspace_billing").select("storage_addon_units").eq("workspace_id", payer).maybeSingle();
    const addonUnits = tier ? Number(wb?.storage_addon_units ?? 0) : 0;
    const list = ((files ?? []) as any[]).map((f) => ({ ...f, bytes: Number(f.bytes) })) as StorageFile[];
    list.sort((a, b) => b.bytes - a.bytes);
    return {
      used: list.reduce((n, f) => n + f.bytes, 0),
      limit: storageLimitFor(tier, addonUnits),
      addonUnits,
      paid: tier != null,
      files: list.slice(0, 300),
    };
  });

/** Deletes the caller's chosen files; files still used by an ad or a published reel are refused. */
export const deleteStorageFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; names: string[] }) => {
    if (!uuid.test(d.workspaceId) || !Array.isArray(d.names) || d.names.length > 200) throw new Error("Invalid input");
    for (const n of d.names) if (typeof n !== "string" || !n.startsWith(`${d.workspaceId}/`) || n.includes("..")) throw new Error("Invalid file");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ deleted: number } | { error: string }> => {
    const sb = context.supabase as any;
    const { data: files } = await sb.rpc("workspace_storage_files", { _ws: data.workspaceId });
    const free = new Set(((files ?? []) as StorageFile[]).filter((f) => !f.in_use).map((f) => f.name));
    const names = data.names.filter((n) => free.has(n));
    if (!names.length) return { error: "Those files are in use, so they were kept." };
    const { data: removed, error } = await sb.storage.from("media").remove(names);
    if (error) return { error: "Couldn't delete those files." };
    return { deleted: removed?.length ?? 0 };
  });

/** Sets how many 10 GB add-ons the paying subscription carries (0 removes it). Prorated by Stripe. */
export const setStorageAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; units: number; environment: StripeEnv }) => {
    if (!uuid.test(d.workspaceId)) throw new Error("Invalid input");
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
    const units = Math.floor(Number(d.units));
    if (!(units >= 0 && units <= STORAGE_ADDON.max)) throw new Error("Invalid amount");
    return { ...d, units };
  })
  .handler(async ({ data, context }): Promise<{ units: number } | { error: string }> => {
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("is_workspace_admin", { _ws: data.workspaceId });
    if (!isAdmin) return { error: "Only the workspace owner or an admin can change billing." };
    const { data: eff } = await sb.rpc("effective_billing", { _ws: data.workspaceId });
    if (!planTier(eff as never)) return { error: "Extra storage is available on paid plans. Choose a plan first." };
    const payer = await payerFor(sb, data.workspaceId);
    const { data: wb } = await sb.from("workspace_billing").select("stripe_subscription_id").eq("workspace_id", payer).maybeSingle();
    if (!wb?.stripe_subscription_id) return { error: "This plan isn't billed here, so storage can't be added. Contact support." };
    try {
      const stripe = createStripeClient(data.environment);
      const sub = await stripe.subscriptions.retrieve(wb.stripe_subscription_id);
      const keyOf = (i: any) => i?.price?.lookup_key || i?.price?.metadata?.lovable_external_id || "";
      const existing = sub.items.data.find((i) => keyOf(i) === STORAGE_ADDON.priceId);
      if (data.units === 0) {
        if (existing) await stripe.subscriptionItems.del(existing.id, { proration_behavior: "create_prorations" });
      } else if (existing) {
        await stripe.subscriptionItems.update(existing.id, { quantity: data.units, proration_behavior: "create_prorations" });
      } else {
        const prices = await stripe.prices.list({ lookup_keys: [STORAGE_ADDON.priceId] });
        const price = prices.data[0];
        if (!price) return { error: "Extra storage isn't available right now." };
        await stripe.subscriptionItems.create({ subscription: sub.id, price: price.id, quantity: data.units, proration_behavior: "create_prorations" });
      }
      return { units: data.units };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
