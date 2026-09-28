import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteInput = { workspaceId: string; email: string; role: "admin" | "editor"; origin: string };

/** Invites someone to a workspace and emails them the accept link. RLS enforces admin-only. */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: InviteInput) => {
    if (!emailRe.test(d.email)) throw new Error("That email address doesn't look right.");
    if (d.role !== "admin" && d.role !== "editor") throw new Error("Invalid role");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const email = data.email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("workspace_invites")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (existing) return { error: "That person already has a pending invite." };

    const { data: inv, error } = await supabase
      .from("workspace_invites")
      .insert({ workspace_id: data.workspaceId, email, role: data.role, invited_by: userId })
      .select("token")
      .single();
    if (error) {
      if (error.message.includes("No seats left")) return { error: "No seats left on this plan. Remove someone or upgrade first." };
      return { error: "Couldn't create the invite. Only owners and admins can invite people." };
    }

    const [{ data: ws }, { data: prof }] = await Promise.all([
      supabase.from("workspaces").select("name").eq("id", data.workspaceId).single(),
      supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    ]);
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("invite", email, {
        templateData: {
          inviterName: prof?.display_name ?? undefined,
          workspaceName: ws?.name ?? undefined,
          acceptUrl: `${data.origin}/invite/${inv.token}`,
        },
        idempotencyKey: `invite-${inv.token}`,
      });
    } catch (e) {
      console.error("Invite email failed:", e);
      return { error: "The invite was created but the email couldn't be sent. Try Resend in a moment." };
    }
    return { ok: true };
  });

/** Resends the email for a pending invite. */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string; origin: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase } = context;
    const { data: inv } = await supabase
      .from("workspace_invites")
      .select("token, email, workspace_id")
      .eq("id", data.inviteId)
      .is("accepted_at", null)
      .maybeSingle();
    if (!inv) return { error: "That invite is no longer pending." };
    const { data: ws } = await supabase.from("workspaces").select("name").eq("id", inv.workspace_id).single();
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("invite", inv.email, {
        templateData: {
          workspaceName: ws?.name ?? undefined,
          acceptUrl: `${data.origin}/invite/${inv.token}`,
        },
        idempotencyKey: `invite-resend-${inv.token}-${Date.now()}`,
      });
    } catch {
      return { error: "Couldn't send the email. Please try again." };
    }
    return { ok: true };
  });
