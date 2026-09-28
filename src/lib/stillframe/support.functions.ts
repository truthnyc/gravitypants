import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuidRe = /^[0-9a-f-]{36}$/i;
const TOPICS = { billing: "Billing", bug: "Bug", question: "Question", feature: "Feature idea" } as const;
type Topic = keyof typeof TOPICS;

type Input = { workspaceId: string; topic: Topic; message: string; adId: string | null; attachmentPath: string | null; origin: string };

/** Files a support ticket (priority set in SQL from the plan) and emails the support inbox. */
export const submitTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!uuidRe.test(d.workspaceId)) throw new Error("Invalid input");
    if (!(d.topic in TOPICS)) throw new Error("Pick a topic.");
    const message = String(d.message ?? "").trim().slice(0, 5000);
    if (message.length < 3) throw new Error("Please write a short message.");
    const adId = d.adId && uuidRe.test(d.adId) ? d.adId : null;
    const path = d.attachmentPath && d.attachmentPath.startsWith(`${d.workspaceId}/support/`) && !d.attachmentPath.includes("..") ? d.attachmentPath : null;
    let origin = "https://gravitypants.com";
    try { origin = new URL(d.origin).origin; } catch { /* keep default */ }
    return { workspaceId: d.workspaceId, topic: d.topic, message, adId, attachmentPath: path, origin };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; priority: boolean } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: t, error } = await supabase
      .from("support_tickets")
      .insert({ workspace_id: data.workspaceId, user_id: userId, topic: data.topic, message: data.message, ad_id: data.adId, attachment_url: data.attachmentPath })
      .select("id, priority")
      .single();
    if (error || !t) return { error: "We couldn't send your message. Please try again." };
    const priority = t.priority === "priority";

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: u }, { data: ws }, { data: b }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("workspaces").select("name").eq("id", data.workspaceId).maybeSingle(),
        supabase.from("workspace_billing").select("plan").eq("workspace_id", data.workspaceId).maybeSingle(),
      ]);
      let attachmentUrl: string | undefined;
      if (data.attachmentPath) {
        const { data: s } = await supabaseAdmin.storage.from("media").createSignedUrl(data.attachmentPath, 60 * 60 * 24 * 30);
        attachmentUrl = s?.signedUrl;
      }
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("support-ticket", "help@gravitypants.com", {
        templateData: {
          priority,
          topic: TOPICS[data.topic],
          message: data.message,
          fromEmail: u.user?.email ?? "",
          workspaceName: ws?.name ?? "",
          planName: b?.plan ?? "",
           adUrl: data.adId ? `${data.origin}/app/ad/${data.adId}/edit` : undefined,
          attachmentUrl,
          ticketId: t.id,
        },
        idempotencyKey: `support-ticket-${t.id}`,
        ...(u.user?.email ? { replyTo: u.user.email } : {}),
      });
    } catch (e) {
      console.error("support email failed", e); // ticket is saved; staff can still see it
    }
    return { ok: true, priority };
  });
