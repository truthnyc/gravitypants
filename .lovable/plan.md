# Manage Billing opening the Stripe sandbox

## What's happening

"Manage Billing" opens the Stripe **sandbox** (test) portal because you are looking at the **preview** of the app. The preview always uses test payments on purpose, so no real money can move while you try things out. This affects Manage Billing, plan checkout, and Buy 5 Exports equally — they all follow the same rule.

I checked your live-payment setup: every go-live step is complete and your live Stripe account is connected, so the **published** site (gravitypants.com) is ready to open the real, live billing portal.

## The fix

1. **Publish the app** so gravitypants.com runs the current build with live payments.
2. On gravitypants.com, go to Account → Billing and click **Manage Billing** — it will open the live Stripe portal.
3. In the preview, Manage Billing will keep opening the sandbox portal — that is by design and cannot be switched off there.

## Technical details

- The environment is chosen from the payment token baked into each build: the preview build carries the test token (`pk_test_…` in `.env.development`), the published build carries the live token (`pk_live_…` in `.env.production`). `getStripeEnvironment()` in `src/lib/stripe.ts` derives `sandbox`/`live` from that prefix, and `createPortalSession` uses it.
- Go-live status: all steps completed (live account `acct_1UKQUOQ2xVwbxpEZ` connected, live keys provisioned).
- If the published site was last published before go-live finished, it may still carry the test token — republishing fixes that.
- No code changes are needed; the earlier customer-ID mismatch fix already handles test-mode customer records when the live portal opens.
