import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planTier } from "./plan";

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
