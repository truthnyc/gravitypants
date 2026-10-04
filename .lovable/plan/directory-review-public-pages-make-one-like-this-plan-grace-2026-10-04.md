# Directory: review, public pages, "Make one like this", plan grace, SEO (briefs 7–12)

Brief 13 (smarter search) stays a later phase and is not part of this plan.

## 7 · Admin → Directory review
- Waiting list (first submissions): preview, brand, website, category, description, tags, moods, and the latest permission entry (name, title, email, time, wording version).
- Before approving, admins can edit tags, moods and category.
- **Approve** makes the reel live, records the brand's first approval, and emails the brand "Your reel is live in the Directory" with links to the reel and the brand page.
- **Reject** asks for a short reason, sets the reel back to private, and emails the reason.
- **Pull back into review** is available on any live reel. A **Reported** list shows reports from the public Report link.

## 8 · Public /directory (matches search.html)
- "Directory" added to the site nav. Showcase stays.
- Hero: "It's [weekday]. Show me something: [mood]" with rotating moods, a 60px search field with a Search button and clear ×, and starter chips.
- Every search gets its own address (`/directory?q=cozy`).
- **No query:** the home page "Made with Gravity Pants" carousel (the same component), then the "Browse the directory" grid.
- **With a query:** "N reels for “q”", a size switch (All · 9:16 · 1:1 · 16:9) and "Also try" words. Then the Featured carousel (Business brands only), then "More reels". Nothing appears twice, and empty sections are hidden. The carousel loops only with 5+ items and can be swiped on phones.
- Grid: square grey tiles with the whole reel at its own shape inside, a size badge, the template name, "sec · Brand", and the matched words in blue.
- Reel detail opens as a pop-up (a bottom sheet on phones), in the order from the brief, ending with "Make one like this" and a small "Report" link.
- Empty results: "Nothing for “q” yet." with suggestions and a "You might like these" carousel.

## 9 · Brand pages /directory/$slug
- Header: logo or initials, category, name, a "★ Featured brand" badge, description, chips, and "Visit [Brand] ↗".
- Reels grid using the same pop-up, then "More brands like [Brand]".
- Old addresses redirect permanently for 12 months.
- Hidden brands show "This brand isn't in the Directory right now" and send a real "not found" answer to search engines.

## 10 · "Make one like this"
- **Signed in:** creates a new ad in the current workspace from the template only, applies the user's brand kit, opens the editor, and shows "Started from the [Template] template."
- **Signed out:** goes to sign-up with the template remembered. The same ad is created after sign-up.
- Each use is recorded (reel, template, user, time) for analytics.

## 11 · Plan end and the 30-day grace period
- The payment webhook records when a paid plan ends. Renewing clears that date and brings back only the reels hidden because of the grace period, with no new review.
- Daily job:
  - After 30 days, live reels are hidden with a "grace" reason. This doesn't touch the permission log, because the brand didn't withdraw.
  - Emails go out on day 0, 14 and 25 with "Renew plan".
  - A brand's address is released 12 months after its reels are hidden.
- Moving from Business to Simple keeps reels live but ends featuring.

## 12 · SEO
- Server-made titles, descriptions, canonical links and share images (reel poster or brand logo).
- Search-result pages are set to noindex, follow.
- Live brand pages are added to the sitemap.
- Brand pages get Organization and VideoObject data for search engines.

## Technical details
- Migration:
  - `directory_reels.hidden_reason` (brand / grace / admin) and `review_note`.
  - `directory_reports` (anyone can add; only admins can read).
  - `directory_make_events`.
  - An admin-only update path for reel review fields.
  - `slug_status` releases old addresses after 12 months.
- Server functions go in `directory.functions.ts`. Public reads use the public client plus signed poster links.
- Emails use the existing transactional templates: reel-live, reel-rejected, plan-ended (day 0/14/25).
- Daily job: `/api/public/directory-daily`, run by pg_cron.
- The carousel is pulled out of the home page into a shared component, so the home page and the Directory use the same code.
