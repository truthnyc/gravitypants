# Aimanté launch plan

## Goal
Launch Aimanté as a searchable, domain-specific brand directory with complete brand pages, a public application form, staff review tools, and verified production redirects.

## Current state confirmed
- `aimante.co` and `www.aimante.co` are already connected and active, and the project is already published.
- Aimanté already has domain-aware routes, metadata, robots rules, and a dynamic sitemap containing its home, About, Join, category, and live brand URLs.
- The database currently has 12 live brands. Each is linked to one published website reel; no client Directory reels are live yet.
- `/join` is currently informational only. The existing `brand_requests` intake has no category, description, moods, logo, review status, or applicant confirmation flow.
- Staff can already edit category lines and each brand’s publication status and affiliated flag. This work will refine and verify those screens rather than duplicate them.
- No verified Google Search Console property currently covers the site, so Google submission cannot complete until `aimante.co` is verified in the connected Google account.

## Build

### 1. Complete Aimanté brand pages
- Keep `/b/:brandSlug` as the public address and use only live brands.
- Give every live brand its own header, description, category and mood details, real reel grid, and clear shop/website action.
- Combine the existing published website reels and approved Directory reels into one consistent grid and modal experience.
- Keep brand-specific titles, descriptions, canonical URLs, Open Graph metadata, and the closing “Reels made with Gravity Pants. Make yours →” link.
- Return a proper not-found result for drafts, unknown brands, and stale addresses while preserving intentional slug redirects.

### 2. Finish the admin editing experience
- Keep the existing Categories screen as the single place to edit the one-line category descriptions.
- Keep brand publication and affiliation controls inside each brand’s Manage panel, but make status, ownership, category, moods, website/shop link, logo, description, and save state easy to review together.
- Ensure every staff change is server-authorized and written to the Audit Log.
- Add focused validation tests for draft visibility, affiliation changes, category lines, and live-brand page access.

### 3. Build the real `/join` application flow
- Replace the static page with a full profile form: contact name, email, brand name, website, category, description, 1–3 moods, logo, and message.
- Validate every field in the browser and again on the server; constrain file type/size and keep uploaded logos private until approval.
- Extend the existing request storage with review state and the new profile fields, without creating a duplicate intake system.
- Send the applicant a branded confirmation email and notify staff after a successful submission.
- Add an Admin requests screen with pending, approved, and declined views. Approval creates a **draft** brand from the submitted details; staff can then add/link reels and publish it. Decline records the decision and can send a short response.
- Make approval idempotent so repeated clicks cannot create duplicate brands.

### 4. Search indexing and sitemap
- Keep `gravitypants.com/directory` and its old Directory URLs out of search and redirect them to the matching Aimanté URLs.
- Keep Aimanté crawlable with domain-specific canonicals, metadata, social image, robots rules, and sitemap entries for only public pages and live brands.
- Make sitemap brand entries use real update timestamps and exclude drafts; include mood pages only when they represent crawlable result pages.
- Verify the deployed `robots.txt`, `sitemap.xml`, canonicals, brand metadata, and HTTP redirects on both domains.
- Connect or verify the `aimante.co` Search Console property and submit `https://aimante.co/sitemap.xml`. If Google requires an owner verification action, stop at that approval step and provide the exact action needed.

### 5. Publish and production verification
- Run the relevant tests, security scan, and browser checks across desktop and mobile before deployment.
- Publish the completed project to the already-connected Aimanté domains.
- Confirm `aimante.co` and `www.aimante.co` serve Aimanté, `/b/purl-soho` works, the form and approval flow work end to end, and `gravitypants.com/directory` returns the intended redirect to `https://aimante.co`.
- Recheck the live sitemap and Google submission after deployment.

## Technical details
- Reuse `directory_brands`, `directory_reels`, `site_reels`, `brand_requests`, the existing email registry, and staff role checks.
- Add only the request fields and status/history needed for the application workflow, with explicit grants, row-level access rules, and staff-only approval functions.
- Keep all public reads limited to live brands and published/live reels; logo uploads remain inaccessible until their application is approved.
- Preserve the TanStack domain rewrite and server redirect architecture; no second app or duplicate brand tables.

## Acceptance checks
- All 12 current live brands have working Aimanté pages with their real reel and website link.
- Draft brands never appear publicly or in the sitemap.
- A brand can submit `/join`, receive confirmation, appear in Admin, and be approved into exactly one draft brand.
- Category lines, affiliated state, and draft/live state persist and are audited.
- Both Aimanté domains serve the correct site after publish; Gravity Pants Directory URLs redirect correctly.
- `aimante.co/sitemap.xml` contains live Aimanté pages only and is submitted to a verified Google Search Console property, or the remaining owner-verification action is clearly identified.
