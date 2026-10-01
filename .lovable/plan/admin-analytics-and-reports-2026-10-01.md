# Admin Analytics and Reports

A new **Analytics** section in the Admin sidebar (after Overview) with five tabs, a shared date range picker (7 / 30 / 90 days / custom), and a weekly summary email.

## Tabs

1. **Traffic**: visitors, page views, bounce rate and visit length over time. Also top pages, where visitors came from, countries and devices. The data comes from the site's built-in analytics for gravitypants.com.
2. **Funnel**: Visitors, then Sign-ups, then First export, then Paid plan, with the conversion rate at each step. Also a weekly breakdown of new sign-ups and how many became paying.
3. **Search (Google)**: clicks, impressions, click rate and average position for the last 28 days. Also top search phrases and top pages, plus whether the homepage is indexed. The data comes from Google Search Console.
4. **Marketing**: sign-ups and paid conversions by source and campaign, read from the link tags on your ad links (utm_source, utm_campaign and so on). Ad spend and cost per sign-up show up if Google Ads or Meta Ads accounts are connected. Otherwise the tab offers a button to connect them.
5. **Revenue**: monthly recurring revenue, new and cancelled plans, extra-export pack sales, and the mix of plans.

## Weekly email

Every Monday at 08:00 New York time, all admins get an email with the headline numbers for last week compared with the week before: visitors, sign-ups, paid conversions, revenue, top source and top search phrase. Each admin can turn it off from the Analytics page.

## What you'll need to do

- Approve connecting **Google Search Console** for gravitypants.com when the card appears.
- Connecting **Google Ads** and **Meta Ads** is optional. Without them, the Marketing tab still works from the link tags, just without spend figures.

## Technical details

- New tracking: a small first-party capture on public pages stores the first-touch `utm_*` values and the referrer in localStorage. On sign-up these are written to a new `signup_attribution` table (workspace_id, user_id, source, medium, campaign, referrer, landing_path). It has RLS, only the owner can insert, and admins read it through server functions.
- Traffic: a server function calls the project analytics API. Search: the Search Console connector through the gateway. Ads: the Google Ads and Meta Ads connectors, if they're linked.
- Funnel and revenue come from existing tables: auth users, `export_usage`, `exports`, `workspace_billing`, `plans`.
- Every function lives in `src/lib/stillframe/admin-analytics.functions.ts` and uses `requireSupabaseAuth` plus an `is_platform_admin` check. If a source fails, that tab shows a "not connected / unavailable" state instead of an error.
- Routes: `src/routes/_authenticated/admin/analytics.tsx`, with tabs set by a search param. A new AdminShell nav item. Charts use the existing recharts setup.
- Email: a new `weekly-report` template, sent by `/api/public/weekly-report`, which is triggered by a cron job and verified with `LOVABLE_CRON_SECRET`. Opt-out is stored in a small `admin_report_prefs` table.
- Every table offers CSV download.
