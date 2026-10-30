import { z } from "zod";

export const supportReplyInput = z.object({
  id: z.string().uuid(),
  replyId: z.string().uuid(),
  message: z.string().trim().min(1).max(5000),
});

export type ReplyDelivery = "pending" | "sent" | "failed" | "suppressed";

/** One logical reply has one email idempotency key, including after a retry. */
export async function deliverSupportReply(
  status: ReplyDelivery,
  actions: {
    send: () => Promise<{ sent: boolean }>;
    saveDelivery: (status: ReplyDelivery) => Promise<void>;
    markAnswered: () => Promise<void>;
  },
) {
  if (status === "suppressed") return { sent: false as const };
  if (status !== "sent") {
    let result: { sent: boolean };
    try { result = await actions.send(); }
    catch {
      await actions.saveDelivery("failed");
      throw new Error("Your reply is saved, but the email couldn't be sent. Try again later.");
    }
    await actions.saveDelivery(result.sent ? "sent" : "suppressed");
    if (!result.sent) return { sent: false as const };
  }
  await actions.markAnswered();
  return { sent: true as const };
}