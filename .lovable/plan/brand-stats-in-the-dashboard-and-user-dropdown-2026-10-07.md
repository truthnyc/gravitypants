# Brand stats in the dashboard and user dropdown

"Brand stats" (views, saves, website clicks) should be easy to reach for Business and Team account holders, and invisible to other plans.

Current state (verified):
- The stats page exists at `/app/account/stats` (account tab) and `/app/stats` (app route). Content is already gated to Business/Team by `canUse("brand_stats")` in `src/lib/stillframe/plan.ts`; other plans see an upgrade prompt.
- The account tabs (`src/components/billing/AccountTabs.tsx`) show a "Stats" tab to everyone.
- The Gravity Pants app header (`src/components/SiteHeader.tsx`, `appNav`) shows a "Stats" link to everyone.
- The only dropdown containing "Your brand page" is the Aimanté avatar menu (`ACCOUNT_LINKS` in `src/components/site/AimanteShell.tsx`); it has no stats entry.

## Changes

1. **Aimanté avatar dropdown** (`src/components/site/AimanteShell.tsx`, `AccountMenu`)
   - Add a "Brand stats" item directly under "Your brand page", linking to `/app/account/stats`.
   - Visible only when `usePlanAccess().canUse("brand_stats")` (Business, Team, or platform admin).

2. **Account tabs** (`src/components/billing/AccountTabs.tsx`)
   - Show the "Stats" tab only when `canUse("brand_stats")` — Business and Team. Other plans no longer see the tab (the page itself keeps its existing upgrade prompt for direct visits).

3. **Gravity Pants app header** (`src/components/SiteHeader.tsx`, `AppBar`/`appNav`)
   - Rename the "Stats" nav item to "Brand stats".
   - Show it only to Business and Team, using the same `usePlanAccess().canUse("brand_stats")` gate inside `AppBar`.

## Notes

- No backend changes: the server already rejects stats for non-Business/Team plans; only visibility changes.
- The stats pages, their metadata, and `/app/stats` keep working as today for eligible plans.

## Verification

- Build passes and `/tmp/observability/build-errors.log` shows no new errors.
- Playwright check signed in: Business/Team sees "Brand stats" in the app header nav and under "Your brand page" in the Aimanté avatar dropdown; other plans see neither, but can still open `/app/stats` and get the upgrade prompt.
