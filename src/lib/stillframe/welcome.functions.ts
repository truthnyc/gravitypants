import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the welcome email once per workspace. Called from the authenticated
 * gate right after ensure_workspace; the idempotency key dedupes repeats.
 * Only sends when the caller's workspace was created in the last 15 minutes.
 */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!membership) return { sent: false };
    const ws = membership.workspace_id as string;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("workspaces").select("created_at").eq("id", ws).maybeSingle();
    const created = w?.created_at ? new Date(w.created_at).getTime() : 0;
    if (!created || Date.now() - created > 15 * 60 * 1000) return { sent: false };

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email as string | undefined;
    if (!email) return { sent: false };
    const { data: p } = await supabaseAdmin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    return sendTemplateEmail("welcome", email, {
      templateData: { name: (p?.display_name as string | null) ?? undefined },
      idempotencyKey: `welcome-${ws}`,
    });
  });
