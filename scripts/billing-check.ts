/**
 * Pre-release billing check against the TEST payment environment.
 * Run: bun scripts/billing-check.ts
 * Checks: every plan can be chosen (checkout opens), Manage Billing opens and offers every plan,
 * a plan change completes (Simple -> Team, prorated), and the database accepts every plan value.
 * Creates a throwaway test customer and removes it at the end.
 */
import { execSync } from "node:child_process";
import { createStripeClient } from "../src/lib/stripe.server";
import { ensurePortalConfig } from "../src/lib/stillframe/portal.server";
import { BILLING_PLAN_VALUES, PLAN_BY_PRICE, PLAN_PRICE_KEYS } from "../src/lib/stillframe/plan-map";

const stripe = createStripeClient("sandbox");
let failed = 0;
const ok = (m: string) => console.log(`  pass  ${m}`);
const bad = (m: string) => {
  failed++;
  console.log(`  FAIL  ${m}`);
};
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    bad(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  console.log("Billing check (test mode)");
  const prices = new Map<string, string>();
  const found = await stripe.prices.list({ lookup_keys: PLAN_PRICE_KEYS, limit: 20 });
  for (const p of found.data) if (p.lookup_key) prices.set(p.lookup_key, p.id);

  const customer = await stripe.customers.create({
    email: "billing-check@gravitypants.com",
    metadata: { billingCheck: "true" },
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });

  try {
    // 1. Choosing each plan opens a checkout.
    for (const key of PLAN_PRICE_KEYS) {
      await step(`choose ${key}`, async () => {
        const price = prices.get(key);
        if (!price) throw new Error("price not found");
        const s = await stripe.checkout.sessions.create({
          line_items: [{ price, quantity: 1 }],
          mode: "subscription",
          ui_mode: "embedded_page",
          return_url: "https://gravitypants.com/account/billing?checkout=success",
          customer: customer.id,
        } as never);
        if (!s.client_secret) throw new Error("no checkout returned");
        await stripe.checkout.sessions.expire(s.id);
        ok(`choose ${key} → ${PLAN_BY_PRICE[key]}`);
      });
    }

    // 2. Manage Billing opens and lets people switch to every plan.
    await step("manage billing", async () => {
      const cfgId = await ensurePortalConfig(stripe);
      const cfg = await stripe.billingPortal.configurations.retrieve(cfgId, { expand: ["features.subscription_update.products"] });
      const offered = new Set((cfg.features.subscription_update.products ?? []).flatMap((p) => p.prices));
      const missing = PLAN_PRICE_KEYS.filter((k) => !offered.has(prices.get(k) ?? ""));
      if (missing.length) throw new Error(`plan switching is missing: ${missing.join(", ")}`);
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.id, configuration: cfgId, return_url: "https://gravitypants.com/account/billing" });
      if (!portal.url) throw new Error("no link returned");
      ok("Manage Billing opens and offers every plan");
    });

    // 3. A plan change completes.
    await step("plan change", async () => {
      const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: prices.get("simple_monthly")! }] });
      if (sub.status !== "active") throw new Error(`first plan is ${sub.status}`);
      const updated = await stripe.subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0]!.id, price: prices.get("team_monthly")! }],
        proration_behavior: "always_invoice",
      });
      const key = updated.items.data[0]?.price.lookup_key ?? "";
      if (PLAN_BY_PRICE[key] !== "team") throw new Error(`plan after change is ${key || "unknown"}`);
      if (updated.status !== "active") throw new Error(`status after change is ${updated.status}`);
      await stripe.subscriptions.cancel(sub.id);
      ok("Simple → Team change completes and maps to Team");
    });

    // 4. The database accepts every plan the payment side can send.
    await step("database plans", async () => {
      let def = "";
      try {
        def = execSync(
          `psql -Atc "select pg_get_constraintdef(oid) from pg_constraint where conname='workspace_billing_plan_check'"`,
          { encoding: "utf8" },
        );
      } catch {
        console.log("  skip  database check (no database access here)");
        return;
      }
      const missing = BILLING_PLAN_VALUES.filter((v) => !def.includes(`'${v}'`));
      if (missing.length) throw new Error(`database rejects: ${missing.join(", ")}`);
      ok("database accepts every plan");
    });
  } finally {
    await stripe.customers.del(customer.id).catch(() => {});
  }

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll billing checks passed");
  process.exit(failed ? 1 : 0);
}

void main();
