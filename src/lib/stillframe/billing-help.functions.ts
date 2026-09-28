import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idRe = /^[a-zA-Z0-9_-]+$/;

/** Owners/admins describe a billing problem; the AI reads this workspace's billing facts and suggests a next step. */
export const diagnoseBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; issue: string; environment: "sandbox" | "live" }) => {
    if (!idRe.test(d.workspaceId)) throw new Error("Invalid input");
    const issue = String(d.issue ?? "").trim().slice(0, 1500);
    if (issue.length < 5) throw new Error("Please describe the problem.");
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
    return { workspaceId: d.workspaceId, issue, environment: d.environment };
  })
  .handler(async ({ data, context }): Promise<{ answer: string } | { error: string }> => {
    const { supabase } = context;
    const { data: isAdmin } = await supabase.rpc("is_workspace_admin", { _ws: data.workspaceId });
    if (!isAdmin) return { error: "Only workspace owners and admins can use the billing helper." };

    const [{ data: billing }, { data: status }, { data: plans }] = await Promise.all([
      supabase.from("workspace_billing").select("plan,status,trial_ends_at,current_period_end,cancel_at_period_end,extra_exports,stripe_customer_id").eq("workspace_id", data.workspaceId).maybeSingle(),
      supabase.rpc("export_status", { _ws: data.workspaceId }),
      supabase.from("plans").select("id,name,amount_cents,interval,monthly_exports,seats").order("sort_order"),
    ]);

    // Subscriptions on the payment provider (no card details), to spot duplicates or mismatches.
    let subs: { status: string; price: string | null; cancel_at_period_end: boolean }[] = [];
    if (billing?.stripe_customer_id) {
      try {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const stripe = createStripeClient(data.environment);
        const list = await stripe.subscriptions.list({ customer: billing.stripe_customer_id, status: "all", limit: 10 });
        subs = list.data.map((s) => ({ status: s.status, price: s.items.data[0]?.price.lookup_key ?? null, cancel_at_period_end: s.cancel_at_period_end }));
      } catch {
        subs = [];
      }
    }

    const facts = JSON.stringify({
      today: new Date().toISOString().slice(0, 10),
      billing: billing ? { ...billing, stripe_customer_id: billing.stripe_customer_id ? "present" : "none" } : null,
      export_status: status,
      subscriptions_at_payment_provider: subs,
      plans,
    });

    try {
      const { gatewayText } = await import("@/lib/ai/gateway.server");
      const answer = await gatewayText(
            "You are the billing helper for Gravity Pants, an app that turns photos into video ads. " +
            "Plans: 7-day free trial (3 watermarked exports), Simple, Business, Business Yearly, Team, Team Yearly; extra-export packs of 5 never expire. " +
            "Plan changes and cancelling happen in Manage Billing (on Account > Billing). Paying for a new plan when one is active is blocked. " +
            "Cancelling keeps access until the end of the paid period. Using the facts given, explain the most likely cause in plain everyday words " +
            "and give one clear next step the owner can take in the app. If the facts show something only support can fix (for example two active subscriptions, " +
            "or the app plan not matching the payment provider), say so and suggest emailing info@gravitypants.com. " +
            "Never invent facts. No emoji, no technical terms, no markdown headings. Keep it under 120 words.",
        [{ role: "user", content: `Billing facts: ${facts}\n\nThe owner says: ${data.issue}` }],
      );
      return { answer: answer.trim() || "I couldn't work this one out. Please email info@gravitypants.com." };
    } catch (e) {
      const { gatewayErrorMessage } = await import("@/lib/ai/gateway.server");
      console.error("diagnoseBilling failed", e);
      return { error: gatewayErrorMessage(e) };
    }
  });
