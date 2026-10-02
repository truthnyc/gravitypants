# Admin control for "Example of the week" and the home banner

Today both are fixed in the code (Purl Soho video, three Purl Soho photos, fixed text). This adds a new **Admin → Homepage** page so you can change them yourself, with no republishing needed.

## What you can edit

**Home banner (top of the home page)**
- Small announcement line and its link text
- Headline (two lines: e.g. "Photos in." / "Reels out.")
- Paragraph under the headline
- Main button and second button text
- Line under the buttons
- The reel in the phone: pick any reel from Website Reels
- The three tilted photos: upload or replace each one, with a short description for each (used by Google and screen readers)

**Example of the week (Examples page, also feeds the home page panel)**
- Pick a reel from Website Reels (video, poster, brand, format and length come from it)
- Title and short description
- Up to three "Original photos" with descriptions
- Chips (photo count, seconds, format, brand) filled in from the reel automatically

## How it works
- Two cards on the page: "Home banner" and "Example of the week", each with a live mini preview and **Save**.
- **Reset to default** brings back the current Purl Soho content.
- If nothing is saved, or something fails to load, the site shows today's Purl Soho content, so the pages never break.
- Every save is recorded in the Audit Log.

## Technical details
- New table `site_settings` (key text primary key: `home_hero`, `example_of_week`; `value jsonb`; `updated_at`, `updated_by`). Grants: select to anon/authenticated, all to service_role; RLS: public read, writes only through admin server functions (`is_platform_admin()` check, audit log entry).
- Photos upload to the existing private `site-reels` bucket under `homepage/`, served with signed links like reels.
- `src/lib/site/homepage.functions.ts`: public `getHomepageContent` (resolves reel + signed photo URLs, falls back to bundled defaults) and admin `saveHomepageSection` / `uploadHomepagePhoto`.
- `src/routes/index.tsx` and `src/routes/examples.tsx` loaders read the content; `FeaturedAdVideo` already accepts video/poster/format props. Hero poster preload uses the chosen reel's poster.
- New route `src/routes/_authenticated/admin/homepage.tsx`; "Homepage" added to the admin sidebar after Website Reels.
- AGENTS.md rule: homepage/example-of-the-week content lives in `site_settings`, with bundled defaults as fallback.
