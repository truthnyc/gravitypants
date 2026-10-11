# Rules for this folder
- Website reel descriptions persist on `site_reels` through staff-checked saves and public published reads, so popups always show edited copy.
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.

- Export history lives in the `exports` table (status/error/bytes) for the admin Exports list; files themselves stay in storage.
- Price→plan mapping lives only in `src/lib/stillframe/plan-map.ts` (webhook, portal, tests share it); the `workspace_billing_plan_check` constraint must list every plan there — a missing value silently drops paid plans.
- Billing uses `peekWorkspaceId()`, refuses duplicate subscriptions server-side, and switches via Manage Billing; `signup-choice.ts` stores only a per-user suggestion, never paid access.
- Pre-release billing checks: `bun run test` (unit) and `bun run check:billing` (test-mode checkout per plan, portal, plan change, DB plan values).
- Export sizes and platform shortcuts live only in `export-sizes.ts`; 4:5 and custom shapes render via `renderAt` with the nearest built-in layout — one config, no second drawing path.
- Main size: `projects.primary_format` is the ad's main size; `main-size.ts` holds the five size names and `refitForMainSize`; header `AdPills` changes it on every step; preview size is temporary UI state.
- Plan gates: every feature check goes through `usePlanAccess().canUse(feature)` in `src/lib/stillframe/plan.ts`; blocked features call `openUpgrade()` (one shared dialog) instead of hiding — one place for plan rules.
- Templates are photo-less styles; examples reuse `insertCopy`; imported system templates preserve per-slide overrides and logo visibility.
