## What gets built (in this draft first)

1. **Backup:** save each brand's and reel's original category before anything moves, so the change can be undone.
2. **New list:** rename and merge the categories into the 14 you listed, in your order, and add Sports & Outdoor. Real Estate and Other stay in admin only. Add Fashion and Food & Drink subcategories, which admins can assign.
3. **Move brands and reels:** Directory brands, Showcase/Examples reels, category moods and brand applications all move to the new names. Nothing is deleted.
4. **Everywhere uses the new list:** filters and counts, search, the carousel, headline/category pages, the Brands page, the sitemap, and the brand application and onboarding forms. Empty categories stay hidden.
5. **Old links:** every old category address permanently redirects to its new one, for example /category/fashion-apparel to /category/fashion. Old mood links (?mood=serene, /mood/serene) also redirect to the new mood name, so page titles and canonical links only use current names.
6. **Check:** test the full list, every redirect and the counts on example data in this draft. Then you accept, and the change reaches your app with no extra step.

## Technical notes
- Add a backup table of the original category per brand and site reel. Change the categories table (names, slugs, sort, `visibility` public/admin, `parent_id` for subcategories). Add `subcategory_id` to brands. Update the `directory_brands_category_check` constraint, `CATEGORIES`/`CATEGORY_COVERS` and the `categoryFromSlug` alias map.
- Redirects are 301s from an old-slug alias table, plus mood aliases in loaders. Tests cover the alias maps and the visibility rules.
