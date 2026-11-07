# Launch video correction
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
- [x] Add staff-only brand outreach drafts with website context, editable email/DM outputs and copy/download controls; never send automatically.
- [x] Add real traffic/signup/export diagnostics with prioritized experiments and explicit attribution limitations.
- [x] Verify staff access, real generation, analytics read-back and desktop/phone presentation; tested as info@gravitypants.com, non-admin access denied, draft editing/download confirmed. Not published.
- [x] Add single-recipient Gmail sending with final approval, audit-backed duplicate protection and sender visibility; keep DMs manual. Nine safeguard tests pass; build OK.
- [x] Verify real signed-in draft generation, blocked Gmail state and desktop/phone layout; no outreach sent.
- [ ] Verify live approval/cancellation and Gmail send/read-back — connected Google account reports “Mail service not enabled”; requires an active Gmail inbox. Preview only.
