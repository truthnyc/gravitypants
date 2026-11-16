import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminForStaff } from "../supabase";

export default defineTool({
  name: "admin_approve_brand_request",
  title: "Admin: approve a brand application",
  description: "Staff only. Approve one pending brand application: creates its draft (unpublished) brand page and emails the applicant. Ask the user to confirm first.",
  inputSchema: {
    request_id: z.string().uuid().describe("Application id from admin_brand_applications."),
    note: z.string().max(1000).optional().describe("Optional internal note."),
    confirm: z.literal(true).describe("Must be true, only after the user confirmed this approval."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ request_id, note }, ctx) => {
    const db = await adminForStaff(ctx, "approve_brand_request");
    const { data: req } = await db.from("brand_requests").select("email, brand, status").eq("id", request_id).maybeSingle();
    if (!req) return { isError: true, content: [{ type: "text", text: "Application not found." }] };
    if (!["pending", "needs_info"].includes(req.status)) return { isError: true, content: [{ type: "text", text: `Already ${req.status}.` }] };
    const args = note ? { _request_id: request_id, _admin_id: ctx.getUserId(), _admin_note: note } : { _request_id: request_id, _admin_id: ctx.getUserId() };
    const { data: brandId, error } = await db.rpc("approve_brand_request", args);
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("brand-application", req.email, { templateData: { subject: `${req.brand}'s Aimanté application was approved`, heading: "Your application was approved", paragraphs: [`We created a draft Aimanté page for ${req.brand}. Our team will review its reels and publish the page when it is ready.`, 'Once your page is live, you can get an optional "As seen on Aimanté" badge for your website from your brand kit: https://aimante.co/brand-kit'] }, idempotencyKey: `aimante-application-approved-${request_id}` });
    } catch (e) { console.error("brand approval email failed", e); }
    return { content: [{ type: "text", text: `Approved ${req.brand}. Draft brand ${String(brandId)} created; it is not published yet.` }] };
  },
});
