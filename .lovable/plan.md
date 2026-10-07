# Brand Stats dashboard (Business and Team)

A new **Brand stats** page in the app (`/app/stats`), linked from the app header for anyone signed in. Business and Team subscribers see their numbers; everyone else sees a preview with an "Upgrade" button that opens the usual upgrade dialog.

## What the page shows

Top: date range (7 / 30 / 90 days) and, if the account has more than one brand, a brand picker.

1. **Headline numbers** with change vs. the previous period:
   - Views (reel opens on Aimanté and the Gravity Pants site)
   - Saves (hearts on reels and on the brand)
   - Website clicks (clicks on "Shop" and the brand's website link)
   - Click rate (clicks / views)
   - A daily line chart of the three.
2. **What works best**
   - **Top reels** table: thumbnail, title, views, saves, clicks, click rate. Sortable, best first.
   - **Top moods**: for each mood on your reels, total views, saves and click rate, as a simple bar list, so you can see e.g. "cozy" reels get clicked twice as often as "bold".
   - **Formats**: same comparison for 9:16, 1:1 and 16:9.
   - One plain-language tip at the top, e.g. "Your cozy reels get the most clicks. Try making another."

Empty state when there's no data yet: "Your stats start as soon as shoppers open your reels."

## Tracking needed

- Views and saves are already recorded.
- Website clicks are not recorded today, so "Shop" and website links on reel popups and brand pages will log a click (no personal data, just reel, brand and time).

## Technical details

- New table `directory_click_events` (brand_id, reel_id nullable, kind 'shop'|'website', workspace derived server-side, created_at); insert only via a public server fn that validates the reel/brand is live, same pattern as `record_directory_reel_open`; no direct client access.
- New `brand_stats` feature in `plan.ts` (`canUse("brand_stats")`), true for Business and Team; also enforced server-side through a SQL check on `effective_billing` — the browser is never trusted.
- `getBrandStats` server fn (`requireSupabaseAuth`), verifies workspace membership and plan, then aggregates views (`directory_reel_views`), saves (`directory_reel_favorites`, `directory_favorites`), clicks, joined to `directory_reels.moods/formats` for the brands owned by the workspace. Only aggregates are returned.
- Team plan: every member of the workspace sees the same stats.
- Charts use the existing recharts setup; tokens from `styles.css`.
- Tests: plan gate (Business/Team yes, Simple/trial no) and click-rate math.
