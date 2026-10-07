# New Aimanté share image

## What changes
- Replace the current Aimanté share picture with the one you just uploaded, at the same address the site already reads. One file swap, no code changes.
- That single file covers every `aimante.co` page: the home page, About, List your brand, every category page, every mood page, sign-in, and any brand page that has no photo of its own.
- Brand pages that already have a logo or a reel still keep showing that brand's own photo — that's how it works today. Tell me if you'd rather the new card show on every page, including brand pages.

## Which upload I'll use
- The 1200×630 one. It's exactly the size link previews want and weighs 94 KB.
- I'll skip the 2400×1260 upload: it arrives at 1920×1008, is 70 KB heavier, and share cards never display that large. Oversized files are the usual reason a chat app shows no preview at all.

## After it's in
- The change reaches the live site on the next publish.
- Even after publishing, messaging apps and search engines keep showing the old picture for a while because they cached it. That clears on their own schedule; it can be forced in the platform's link preview debugger.

## Technical details
- `aimanteHead()` in `src/lib/site/brand-site.ts` defaults `image` to `${AIMANTE_ORIGIN}/og-aimante.jpg`, and every Aimanté route calls it without overriding the image except brand pages. So overwriting `public/og-aimante.jpg` is sufficient; no route or head edits.
- Copy `/mnt/user-uploads/aimante-og-reels-1200x630_1.jpg` over `public/og-aimante.jpg`, keeping 1200×630 and re-encoding to keep it under ~150 KB.
- Verify in the preview with `?brand=aimante`: the `og:image` and `twitter:image` tags must both still point at `https://aimante.co/og-aimante.jpg`, and the served file must be the new one (byte size matches the new upload).
- No sitemap, robots or JSON-LD changes.
