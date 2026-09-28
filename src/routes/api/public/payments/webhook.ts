import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

const PLAN_BY_PRICE: Record<string, string> = {
  simple_monthly: "simple",
  business_monthly: "business",
  business_yearly: "business_yearly",
  team_monthly: "team",
  team_yearly: "team_yearly",
};

function mapStatus(s: string): string {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled";
}

const PLAN_NAMES: Record<string, string> = {
  simple: "Simple",
  business: "Business",
  business_yearly: "Business Yearly",
  team: "Team",
  team_yearly: "Team Yearly",
};

const iso = (sec?: number | null) => (sec ? new Date(sec * 1000).toISOString() : null);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Workspace owner's email + display name, for lifecycle emails. */
async function ownerContact(db: any, ws: string) {
  const { data: m } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ws)
    .eq("role", "owner")
    .maybeSingle();
  if (!m) return null;
  const { data: u } = await db.auth.admin.getUserById(m.user_id);
  const email = u?.user?.email as string | undefined;
  if (!email) return null;
  const { data: p } = await db.from("profiles").select("display_name").eq("user_id", m.user_id).maybeSingle();
  return { email, name: (p?.display_name as string | null) ?? undefined };
}

/** Sends a lifecycle email; failures are logged, never thrown (billing sync must not fail). */
async function sendLifecycle(template: string, ws: string, data: Record<string, unknown>, key: string) {
  try {
    const db = await admin();
    const contact = await ownerContact(db, ws);
    if (!contact) return;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail(template, contact.email, {
      templateData: { name: contact.name, ...data },
      idempotencyKey: key,
    });
  } catch (e) {
    console.error("Lifecycle email failed:", template, e);
  }
}

async function syncSubscription(sub: any, env: StripeEnv, deleted = false) {
  const db = await admin();
  let ws: string | undefined = sub.metadata?.workspaceId;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!ws && customer) {
    const { data } = await db.from("workspace_billing").select("workspace_id").eq("stripe_customer_id", customer).maybeSingle();
    ws = data?.workspace_id;
  }
  if (!ws) {
    console.error("Subscription without workspace", sub.id);
    return undefined;
  }
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
  return { ws, plan };
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
      // One-time top-up pack: credit 5 extra exports once payment is final.
      if (ws && obj.mode === "payment" && obj.metadata?.topup === "extra_exports_5" && obj.payment_status !== "unpaid") {
        const db = await admin();
        const { data: b } = await db.from("workspace_billing").select("extra_exports, last_topup_session").eq("workspace_id", ws).maybeSingle();
        if (b && b.last_topup_session !== obj.id) {
          await db
            .from("workspace_billing")
            .update({ extra_exports: (b.extra_exports ?? 0) + 5, last_topup_session: obj.id })
            .eq("workspace_id", ws);
        }
      }
      break;
    }
    case "customer.subscription.created": {
      const r = await syncSubscription(obj, env);
      if (r?.ws && r.plan) {
        await sendLifecycle("plan-started", r.ws, { planName: PLAN_NAMES[r.plan] ?? "Your plan" }, `plan-started-${obj.id}`);
      }
      break;
    }
    case "customer.subscription.updated":
      await syncSubscription(obj, env);
      break;
    case "customer.subscription.deleted": {
      const r = await syncSubscription(obj, env, true);
      if (r?.ws) {
        const end = obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : undefined;
        await sendLifecycle("plan-cancelled", r.ws, { endDate: end }, `plan-cancelled-${obj.id}`);
      }
      break;
    }
    case "invoice.payment_failed": {
      const db = await admin();
      if (obj.customer) {
        await db.from("workspace_billing").update({ status: "past_due" }).eq("stripe_customer_id", obj.customer);
        const { data } = await db.from("workspace_billing").select("workspace_id").eq("stripe_customer_id", obj.customer).maybeSingle();
        if (data?.workspace_id) {
          await sendLifecycle("payment-failed", data.workspace_id, {}, `payment-failed-${obj.id}`);
        }
      }
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
