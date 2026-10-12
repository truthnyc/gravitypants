# Align Stripe checkout plans with Pricing

## Confirmed mismatch
The Stripe catalogue is stale in both test and live checkout:
- Simple says “Stillframe Simple” and “2 exports every billing month”; Pricing says 1 seat and 10 exports a month.
- Business says “Stillframe Business” and “Unlimited exports”; Pricing says 1 seat and 50 exports a month.
- Team says 3 seats; Pricing says 5 seats (“You + 4 teammates”), 150 shared exports, shared brand kits/templates and priority support.

## Changes
1. Make the existing Pricing plan configuration the source for Stripe-facing names and descriptions, using its current feature wording rather than maintaining separate checkout copy.
2. Update the existing Simple, Business and Team products in Stripe test and live catalogues. Keep all product IDs, price IDs, amounts and billing intervals unchanged; only correct the customer-visible product names/descriptions.
3. Add a small catalogue consistency check covering all three plans, including concrete assertions for 10/50/150 exports and 1/1/5 seats, so stale checkout descriptions are caught before release.
4. Verify every monthly and yearly checkout price resolves to the corrected product details and run the focused billing tests.

## Expected checkout labels
- Gravity Pants Simple — the current Simple features from `/pricing`.
- Gravity Pants Business — the current Business features from `/pricing`.
- Gravity Pants Team — the current Team features from `/pricing`, including 5 seats.
