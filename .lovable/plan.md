# SEO fixes from the review

## 1. Structured data
- Home: Organization + WebSite + SoftwareApplication (name, description, category, free trial offer).
- /pricing: Product/SoftwareApplication with one Offer per plan (prices taken from the existing plans list).
- Blog posts: BlogPosting (headline, date, author "Gravity Pants", canonical URL) plus BreadcrumbList.
- /help: skipped FAQPage. Google no longer shows FAQ results for sites like this one, so it would not help.

## 2. Homepage says what the product is
- Title: "Gravity Pants – Turn Product Photos into Video Ads & GIFs".
- Description of about 150 characters: turns product photos into short MP4 video ads and GIFs for Instagram, TikTok and Facebook in minutes, with a free trial.
- The large "Photos in. Reels out." heading stays the same. A short line under it with the words "product photos into video ads" is added so search engines can read what the product does.

## 3. Sign-in and sign-up
- Take /signin and /signup out of the sitemap and mark both "noindex".

## 4. Image descriptions
- Add real descriptions to the three Purl Soho photos on the homepage, and to the stills in the before/after panels.

## 5. Sitemap dates
- Each page gets a fixed "last changed" date, updated only when that page changes. Blog posts keep their publish dates.

## 6. Minor
- Use one homepage address everywhere: https://gravitypants.com/ (with the slash) for the canonical link, og:url and the sitemap.
- Shorten the "three-photo rule" post title to under 60 characters. The full title stays as the heading on the page.

## Not in this pass (needs your input)
- More writing: longer blog posts, new pages for searches like "photo to video ad maker" and "product GIF maker", and more text on Examples and Showcase. I'd research the search terms first and write the drafts only with your approval, using real product facts.
- Speed: check with PageSpeed Insights after the next publish.

All changes reach the live site on the next publish.

## Technical details
- JSON-LD goes in the `scripts` of each route's `head()`. Blog uses loader post data.
- `sitemap[.]xml.ts`: remove the signup entry and replace `lastmod: today` with a per-page `lastmod` field.
- signin.tsx and signup.tsx get `{ name: "robots", content: "noindex, follow" }`.
