# Launch video correction
## Google Ads analytics
- [x] Add staff-only live Google Ads reporting and dedicated Analytics tab; signed-in real account data, date filters, CSV and mobile layout verified; four reporting/tag tests pass. Preview only.
## Product-link AI public pages
- [x] Describe page understanding, fact/photo review and three story drafts on Features, How it works, homepage, Pricing and Help; preserve paid-only availability and existing pricing. Verified all five pages at desktop/phone sizes with no overflow; 25 pricing/metadata tests pass. Preview only.
## Agent integrations
- [x] Add protected workspace/ad reading tools, consent and sign-in return handling, plus browser-local ad search. Manifest generated; safe-return tests pass; signed-in approve/deny, OAuth exchange and real workspace/ad reading verified with the allowed hosted Origin substituted for localhost. Unsigned requests rejected; build OK.
- [ ] Republish to expose the new agent integrations on the hosted app; verify the full hosted sign-in/consent flow after publishing. Existing account service retained; OAuth server newly enabled.
## Stage desktop layout
- [x] Move tags and Save beneath the reel on desktop; verified reel-width tag alignment, expand/collapse and next-arrow navigation, with phone layout unchanged. Preview only.
## Brand owner dashboard layout
- [x] Give reel details, actions and product editing separate full-width rows; signed-in desktop/phone checks confirm contained product inputs, full-width tabs and no dashboard overflow. Preview only.
## Current monitoring fixes
- [x] Repair brand approval and legacy mood-link trigger; rollback-only six-mood approval creates the draft and all links, with staff access protections unchanged.
- [x] Repair 4:5/5:4 Directory mappings and explicit 4:5 carousel sizing; 19 tests pass and Sail Racing's portrait grid thumbnail verified. Carousel sizing awaits publishing.

- [x] Replace the launch film’s Aro segment with its corrected reel, preserve the rest of the film, and provide a versioned download.
- [x] Update the website preview video asset; verified corrected AW 26-27 wording, all scenes, 19-second 1080p output and three video schema/sitemap tests. Not published.

# Referral program page
- [x] Add a public referral guide and link it from the shared Pricing and Help FAQ.
- [x] Verify both FAQ links, export illustration, sign-in destination and desktop/phone presentation; 24 pricing/search tests pass and build is healthy.

# Product-reel search metadata
- [x] Write unique titles, descriptions and accurate structured data for all 37 Gravity Pants sitemap entries.
- [x] Verify all 37 server-rendered pages and browser titles; preserve existing video, article and pricing data. Six tests passed and build is healthy.
- [ ] Publish the search metadata — awaiting explicit publishing approval.

# Gravity Pants pixel
- [x] Add website-visit measurement with regional advertising consent, withdrawal and privacy disclosure.
- [x] Verify allowed transmission, rejection, saved-choice history and host exclusions; 18 tests pass and build is healthy. Browser test received a 200 response for PageView; Meta stats still empty, so provider receipt remains unverified.
- [ ] Publish and verify the live installation — awaiting explicit publishing approval.

# Photo-to-video article
- [x] Correct 5:4/16:9 guidance, add manual Instagram posting steps and a contextual How it works link; preserve Château Méaume visuals.
- [x] Verified contextual-link navigation, format advice, manual posting instructions and retained images in the preview; build passed.

# Admin client replies
- [x] Add staff-only reply sending, saved reply history and clear delivery outcomes.
- [x] Verify permissions, retry safety and signed-in sending to the staff account; email log confirms sent, and Answered status/reply history survive reload.

# Public-site performance
- [x] Add staff-only client onboarding with shared Directory/Aimanté brand details and explicit workspace linking; verified private draft creation and Directory read-back as info@gravitypants.com, with 28 regression tests. Private verification rows removed after testing.
- [x] Recheck public asset Cache-Control: tested immutable assets return one-year caching; media, brand-assets and site-reels buckets remain private, unsigned downloads and anonymous signing are denied.
- [x] Rank 1: verified hashed bundles/CDN media already have one-year immutable caching; moved active icons/share artwork to immutable CDN URLs while preserving old links and private-file protections.
- [x] Rank 2: compressed three public MP4s by 81–85% with unchanged dimensions/durations and three blog photos by 31–57%; verified headers, blog images/animation and existing WebM playback, plus 21 regression tests. Sandbox Chromium cannot decode H.264, so optimized MP4 browser playback remains unverified; local decoding/frame checks passed.

# Shopify reel styling
- [x] Preserve template logo settings across creation, uploads and size changes; repaired six existing Shopify reels.
- [x] Add shared editor Style controls with immediate preview and saved changes.
- [x] Preserve slide styling during add/remove/reorder; reset styling without changing photos or words.
- [x] Run regression tests and verify real shop-scoped saving/reload at desktop and phone sizes. Actual Shopify-admin incognito embedding remains a merchant-side check.

# Getting started tutorial
- [x] Replace tutorial mockups with twelve real app screenshots; verified Help entry, loaded images and desktop/phone display. Shopify is image-free pending a real in-store screenshot.
- [x] Add shared guide/Help content and thirteen illustrated sections.
- [x] Add private guide route, desktop/mobile navigation, Help entry points and support dialog.
- [x] Verify signed-out redirect and signed-in guide, metadata/sitemap exclusion, section history/focus, Help links/support dialog, 375/768/1440px layouts and 12 existing rule tests.
- [x] Add Tutorial row to the phone ☰ menu for signed-in users, between Billing and Help.
- [x] Add a Tutorial link next to Templates on the Your Ads home screen; verified desktop/phone display and that it opens /app/guide.
# Reel description length
- [x] Raise the reel description limit from 120 to 300 characters everywhere it is used; verified the admin Directory box accepts 300 and the share validator rejects 301.

# Google services
- [x] Tag Manager loader on public Gravity Pants pages (off until container ID supplied).
- [x] Google Analytics browser tracking using saved Measurement ID (live on gravitypants.com after publish).
- [ ] Analytics report reading in admin — needs the Analytics connection.
- [ ] Merchant Center product feed.
- [ ] Google Business Profile — check eligibility (online-only businesses can't list).

- [ ] Publish so GA4/GTM send visits; confirm in admin dashboard (GA report reading needs Analytics "Read insights" connection)

# Admin Marketing Hub
- [x] Correct Campaign Monitor content URL deployment selection and add exact-HTML preflight; 20 tests pass and build OK. Signed-in original one-recipient Invitation attempt safely stopped before provider creation because hosted content remains unavailable.
- [x] Published script-free email content and sent the approved Invitation test to info@ippawards.com; signed-in UI and Campaign Monitor sent-campaign records confirm one recipient, with accepted audit receipt. Inbox arrival remains unverified.
- [x] Add Campaign Monitor list delivery alongside Gmail with staff checks, stored final approval and atomic duplicate protection; 16 tests pass. Verified real Brands list (36 active subscribers), desktop/phone review and cancellation, and unsigned content 404; no email sent.
- [x] Published Campaign Monitor integration and verified the approved real Invitation campaign in Campaign Monitor’s sent records; one recipient only.
- [x] Add staff-only brand outreach drafts with website context, editable email/DM outputs and copy/download controls; never send automatically.
- [x] Add real traffic/signup/export diagnostics with prioritized experiments and explicit attribution limitations.
- [x] Verify staff access, real generation, analytics read-back and desktop/phone presentation; tested as info@gravitypants.com, non-admin access denied, draft editing/download confirmed. Not published.
- [x] Add single-recipient Gmail sending with final approval, audit-backed duplicate protection and sender visibility; keep DMs manual. Nine safeguard tests pass; build OK.
- [x] Verify real signed-in draft generation, blocked Gmail state and desktop/phone layout; no outreach sent.
- [ ] Verify live approval/cancellation and Gmail send/read-back — connected Google account reports “Mail service not enabled”; requires an active Gmail inbox. Preview only.

# Directory
- [x] Preserve Directory text, brand, mood and category filters when opening stage reels; verified real search/brand/mood entry and reload, with 10 regression tests including selections beyond 240 matches. Preview only.
- [ ] Automatically announce new /blog articles as Instagram feed posts, tagging credited photographers using verified Instagram handles — blocked: existing Meta connection lacks Instagram publishing permission and returns no linked Instagram account; requires a professional Instagram publishing connection. No posting automation enabled.
- [x] Randomize the Directory grid per visit: seeded shuffle in directory_faceted_search (stable while paging, reshuffles each visit); verified two preview visits show different orders. Live in the database now; page code ships on next publish.
- [x] Fix Cloud Down Hood export download link
- [x] Stage view "← Directory" now opens the top of the grid (clean address) instead of the browser's Back step, so ?page=… no longer follows you home. Verified in preview: /stage → / with no page param. Preview only.
- [ ] Aimanté Google ad: goal visits, $10/day; next: locations, research, campaign type

# Discovery plan
- [x] Correct category links with tracking/preview parameters; confirm updated public intros and Food & Drink hint; group/create/rename subcategories and save validated brand assignments. Signed-in create/rename/reload and real brand assignment read-back verified; temporary data removed and original assignment restored. Desktop/phone checked, 18 tests pass. Page changes await publishing.
- [x] Trim public filters to Category, Brand and Mood; search tags and 12-per-click loading unchanged. All three panels, real category selection and phone sheet verified; 37 regression tests pass. Preview only.
- [x] Step 1: filter counts, hide empty values, on-screen autoplay, headline mood end dates; draft accepted into main, 4 headline-mood tests pass, signed-in admin settings and live Directory verified (12 per click kept). Preview only.
- [ ] Step 2: reclassify categories in a fresh draft.
- [ ] Step 3: migrate reel tags in a fresh draft.
