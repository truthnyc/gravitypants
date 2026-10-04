# Rules for this folder
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.

- Export history lives in the `exports` table (status/error/bytes) for the admin Exports list; files themselves stay in storage.
- Price→plan mapping lives only in `src/lib/stillframe/plan-map.ts` (webhook, portal, tests share it); the `workspace_billing_plan_check` constraint must list every plan there — a missing value silently drops paid plans.
- Billing uses `peekWorkspaceId()`, refuses duplicate subscriptions server-side, and switches via Manage Billing; `signup-choice.ts` stores only a per-user suggestion, never paid access.
- Pre-release billing checks: `bun run test` (unit) and `bun run check:billing` (test-mode checkout per plan, portal, plan change, DB plan values).
