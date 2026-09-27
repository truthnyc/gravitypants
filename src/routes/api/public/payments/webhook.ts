import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

const PLAN_BY_PRICE: Record<string, string> = {
  simple_monthly: "simple",
  business_monthly: "business",
  business_yearly: "business_yearly",
};

function mapStatus(s: string): string {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled";
}

const iso = (sec?: number | null) => (sec ? new Date(sec * 1000).toISOString() : null);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function syncSubscription(sub: any, env: StripeEnv, deleted = false) {
  const db = await admin();
  let ws: string | undefined = sub.metadata?.workspaceId;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!ws && customer) {
    const { data } = await db.from("workspace_billing").select("workspace_id").eq("stripe_customer_id", customer).maybeSingle();
    ws = data?.workspace_id;
  }
  if (!ws) return console.error("Subscription without workspace", sub.id);
  const item = sub.items?.data?.[0];
  const key = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || "";
  const plan = PLAN_BY_PRICE[key];
  await db
    .from("workspace_billing")
    .update({
      stripe_customer_id: customer ?? null,
      stripe_subscription_id: sub.id,
      environment: env,
      plan: deleted ? "none" : plan ?? "none",
      status: deleted ? "canceled" : mapStatus(sub.status),
      current_period_start: iso(item?.current_period_start ?? sub.current_period_start),
      current_period_end: iso(item?.current_period_end ?? sub.current_period_end),
      cancel_at_period_end: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    })
    .eq("workspace_id", ws);
}

async function handle(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const ws = obj.metadata?.workspaceId;
      if (ws && obj.customer) {
        const db = await admin();
        await db.from("workspace_billing").update({ stripe_customer_id: obj.customer, environment: env }).eq("workspace_id", ws);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(obj, env);
      break;
    case "customer.subscription.deleted":
      await syncSubscription(obj, env, true);
      break;
    case "invoice.payment_failed": {
      const db = await admin();
      if (obj.customer) await db.from("workspace_billing").update({ status: "past_due" }).eq("stripe_customer_id", obj.customer);
      break;
    }
    default:
      break;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
