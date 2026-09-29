# Free trial: 3 watermarked exports with every feature

## What's already in place
- The export limit already allows an active trial 3 exports in total, each with the watermark. The limit is checked on the server.
- The pricing page and FAQ already say "3 watermarked exports".

## What's missing
- The app blocks trial users from GIFs, brand kits and templates, so "every feature" isn't true yet.
- Trial isn't something you can pick. It only shows as a banner on the pricing page, not as a card next to the paid plans.

## Changes
1. **Unlock every feature during the trial.** Trial users can make GIFs, create brand kits and save templates. The same rule is added on the server so it can't be bypassed. Exports stay capped at 3, all watermarked.
2. **Free Trial card on the pricing page.** It sits next to Simple, Business and Team and shows:
   - $0, 7 days
   - "Try every feature and make 3 watermarked exports."
   - 3 exports, watermark on, all formats, MP4 and GIF, brand kits, templates
   - A "Start free trial" button that goes to sign up
3. **Trial counter in the app.** The trial pill and the export screen show "N of 3 trial exports left · watermarked". When the 3 are used, the shared upgrade dialog opens.
4. **Sign-up.** A "Free trial" option is picked by default.
5. **Billing page.** A trial workspace shows "Free trial · N of 3 exports left" above the plan cards.

## Technical details
- `plan.ts` `canUseWith`: `gif`, `brand_kits` and `templates` return `e.paid || e.trial`.
- New migration: `brand_kits_enabled(_ws)` (and any template-save check) also returns true for an active trial (`plan='trial'`, `status='trialing'`, `trial_ends_at > now()`). `export_status` stays as it is (3 in total, watermark true).
- The export flow already passes `watermark` from `export_status` into `renderAt`. Confirm this, with no new drawing path.
- Pricing grid gets a `TRIAL` card from `plans-config.ts`. The signup chip uses `signup-choice.ts` (a suggestion only).
- Verify signed in as a trial workspace: a GIF export is allowed and watermarked, the 4th export is blocked, and a brand kit can be created.
