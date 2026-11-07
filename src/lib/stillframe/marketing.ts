import { z } from "zod";

export const publicWebsite = z.string().trim().max(500).transform((value) => value.startsWith("https://") ? value : `https://${value}`).refine((value) => {
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443")
      && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h) && /\.[a-z]{2,}$/.test(h)
      && !/\.(localhost|local|internal|test|invalid|example)$/.test(h)
      && !h.endsWith(".nip.io") && !h.endsWith(".sslip.io");
  } catch { return false; }
}, "Enter a public HTTPS website address.");

export const outreachInput = z.object({
  website: publicWebsite,
  brand: z.string().trim().min(1, "Enter a brand name.").max(100),
  contact: z.string().trim().max(100).default(""),
  notes: z.string().trim().max(2000).default(""),
  offer: z.enum(["try_app", "aimante_preview"]),
});
export type OutreachInput = z.infer<typeof outreachInput>;
export const outreachOutput = z.object({
  summary: z.string().min(1).max(1800),
  angle: z.string().min(1).max(1000),
  subject: z.string().min(1).max(200),
  email: z.string().min(1).max(5000),
  dm: z.string().min(1).max(1500),
});
export type OutreachDraft = z.infer<typeof outreachOutput> & { source: string; readAt: string };
export const diagnosisOutput = z.object({
  summary: z.string().min(1).max(1800),
  actions: z.array(z.object({ title: z.string().max(150), evidence: z.string().max(1000), experiment: z.string().max(1200), measure: z.string().max(600) })).min(1).max(3),
});
export type Diagnosis = z.infer<typeof diagnosisOutput>;
export const marketingPeriod = z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) });
export function marketingRange(days: number, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { from: new Date(end.getTime() - days * 86400000).toISOString(), to: end.toISOString() };
}
export function requireMarketingAdmin(result: { data: unknown; error: unknown }) {
  if (result.error || result.data !== true) throw new Error("Not found");
}
export function parseMarketingJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return schema.parse(JSON.parse(cleaned));
}