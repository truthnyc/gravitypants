# Admin client replies
- [ ] Add staff-only reply sending, saved reply history and clear delivery outcomes.
- [ ] Verify permissions, retry safety and the signed-in reply flow.

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