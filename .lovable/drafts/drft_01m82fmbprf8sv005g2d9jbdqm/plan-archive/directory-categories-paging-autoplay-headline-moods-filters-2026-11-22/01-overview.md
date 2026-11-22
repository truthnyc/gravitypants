# Directory: categories, paging, autoplay, headline moods, filters

Much of this already exists. The plan reuses the existing **Admin → Directory settings** page (`site_settings` row read through `src/lib/directory/settings.ts`) and the single search function `directory_faceted_search`. No new tables.

## What already exists (won't duplicate)

| Ask | Today |
|---|---|
| 1. Coming soon | Toggle "Show empty categories as 'Coming soon'" (`comingSoon`). Empty categories show greyed in a "Coming soon" group of the Category filter. |
| 2. 12 per page | `pageSize` = 12 already. |
| 3. Auto-load | `autoLoadPages` exists (0–5). You set it to 0 last week. |
| 4. Headline moods | "Moods in the headline rotation" chips (`headlineMoods`) already pick the moods. No end dates. |
| 5. Counts | Search already returns a count per mood, category and brand. You asked earlier to **remove all reel counts**, so they're hidden now. |
| 5. AND logic | Already AND *between* filter types (mood AND category AND brand). Inside one type it's OR (Cozy *or* Coastal). |
| 5. Keywords | Keywords typed when sharing are saved as the reel's tags and are **already searched** for Directory reels. Website (Showcase) reels' tags are not. |

## Changes

1. **Hide Coming soon from visitors.** Visitors never see empty categories in the filter, the Brands page category list or carousel rules. Admin pages keep showing them labelled "Coming soon". The existing toggle gets removed (or kept for admin preview only).
2. **Autoplay only on screen.** Directory, brand, category and mood grids play a reel only while it's mostly visible. Off-screen ones pause. Reduced-motion users get posters only.
3. **Auto-load 2 pages, then a button.** After the first 12, scrolling loads 2 more pages on its own (36 reels total), then shows "Load more" (12 per click). Setting the default to 2 and changing it to start on scroll, not after the first click.
4. **Headline moods with end dates.** Each chosen mood can get an optional "Show until" date (for example Black Friday until Nov 30). After that date it drops out of the rotation automatically, in New York time.
5. **Filters.**
   - Show the count next to each value (overrides your earlier "remove all reel counts" for filters only; reel totals elsewhere stay hidden).
   - Hide values with 0 matching reels, unless selected.
   - Combining stays as today: different filter types combine with AND (mood AND category AND brand); several values inside one type stay OR (Cozy or Coastal).
   - Add Showcase reels' tags to search too.
