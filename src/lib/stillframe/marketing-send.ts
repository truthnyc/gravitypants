import { z } from "zod";

export const marketingSendInput = z.object({
  requestId: z.string().uuid(),
  to: z.string().trim().email().max(254).refine((v) => !/[\r\n]/.test(v)),
  subject: z.string().trim().min(1).max(200).refine((v) => !/[\r\n]/.test(v), "Subject must be one line."),
  body: z.string().trim().min(1).max(5000),
  approved: z.literal(true),
});
export type MarketingSendInput = z.infer<typeof marketingSendInput>;
export type MarketingSendResult = { status: "sent" | "blocked" | "unknown"; message: string };

const base64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
export function marketingRawEmail(input: MarketingSendInput) {
  const subject = /^[\x00-\x7F]*$/.test(input.subject) ? input.subject : `=?UTF-8?B?${base64(input.subject)}?=`;
  return base64([`To: ${input.to}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "", input.body].join("\r\n"))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function deliverMarketingEmail(input: MarketingSendInput, deps: {
  claim: () => Promise<boolean>;
  send: (raw: string) => Promise<string>;
  finish: (status: "sent" | "unknown", messageId?: string) => Promise<void>;
}): Promise<MarketingSendResult> {
  const validated = marketingSendInput.parse(input);
  if (!await deps.claim()) return { status: "blocked", message: "This send was already attempted. Check Gmail Sent before sending again." };
  try {
    const id = await deps.send(marketingRawEmail(validated));
    await deps.finish("sent", id);
    return { status: "sent", message: `Sent to ${validated.to}` };
  } catch {
    await deps.finish("unknown").catch(() => undefined);
    return { status: "unknown", message: "Sending could not be confirmed. Check Gmail Sent before creating another send; no automatic retry will occur." };
  }
}