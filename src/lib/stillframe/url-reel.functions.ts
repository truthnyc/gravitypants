import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planTier } from "./plan";
import { DIFFERENCE_MAX, MUST_SAY_MAX } from "./url-reel";

/** Same membership and paid-plan check for every step. */
async function gate(supabase: any, ws: string) {
  const [{ data: member }, { data: billing }, { data: admin }] = await Promise.all([
    supabase.rpc("is_workspace_member", { _ws: ws }),
    supabase.rpc("effective_billing", { _ws: ws }),
    supabase.rpc("is_platform_admin"),
  ]);
  if (!member) return { ok: false as const, error: "You can't add ads to this workspace." };
  if (!admin && planTier(billing as never) == null) return { ok: false as const, locked: true as const, error: "Creating from a link is on paid plans." };
  return null;
}

const FORMAT = z.enum(["9:16", "4:5", "1:1", "5:4", "16:9"]);

/** Step 1: read the page and return what was understood (product, photos, brief). */
export const readProductForDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid(), url: z.string().trim().url().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const blocked = await gate(context.supabase, data.workspaceId);
    if (blocked) return blocked;
    const m = await import("./url-reel.server");
    return m.readProductForDrafts(context.supabase as never, data);
  });

/** Step 2: write three drafts from that read plus the person's edits (null = "Looks right, skip"). */
export const writeDraftsFromBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(), format: FORMAT, token: z.string().min(10).max(200_000),
    edits: z.object({
      keepFacts: z.array(z.number().int().min(0).max(50)).max(50),
      keepPhotos: z.array(z.string().uuid()).min(1).max(12),
      difference: z.string().max(DIFFERENCE_MAX).nullable(),
      mustSay: z.string().max(MUST_SAY_MAX).nullable(),
    }).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const blocked = await gate(context.supabase, data.workspaceId);
    if (blocked) return blocked;
    const m = await import("./url-reel.server");
    return m.writeDraftsFromBrief(context.supabase as never, data);
  });

/** Signed-in, paid plans: read a product page and return three ready-to-use reel drafts. */
export const draftFromProductUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(),
    url: z.string().trim().url().max(2000),
    format: z.enum(["9:16", "4:5", "1:1", "5:4", "16:9"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: member }, { data: billing }, { data: admin }] = await Promise.all([
      context.supabase.rpc("is_workspace_member", { _ws: data.workspaceId }),
      context.supabase.rpc("effective_billing", { _ws: data.workspaceId }),
      context.supabase.rpc("is_platform_admin"),
    ]);
    if (!member) return { ok: false as const, error: "You can't add ads to this workspace." };
    // AI writing is paid-only: decided here, never by the browser.
    if (!admin && planTier(billing as never) == null) return { ok: false as const, locked: true as const, error: "Creating from a link is on paid plans." };
    const { draftReelsFromUrl } = await import("./url-reel.server");
    return draftReelsFromUrl(context.supabase as never, data);
  });
