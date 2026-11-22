## A) Four filter types

**What visitors see**
- The Directory filter bar shows Category, Brand, Mood, Occasion, Season, Setting side by side, same two-line dropdown style. On phones they're in the same bottom sheet, in the same order.
- Same rules as now: any match within one filter, all must match across filters, counts shown, empty values hidden, 12 per "Load more".
- Each filter has its own web address part, so shared links, back button, Stage, and opening a reel keep every choice. Old `?mood=serene` style links still work: they're quietly turned into the new value (e.g. `mood=calm`, or `season=winter` for cold).
- Search understands all four ("cozy winter gift" picks Mood Cozy, Season Winter, Occasion Gift).
- Headline moods, their Show-until dates, carousel rules and mood pages (`/mood/...`) work for Occasion, Season and Setting values too. Old mood pages for renamed moods redirect to the new one (e.g. `/mood/serene` → `/mood/calm`).

**Admin**
- The reel editor shows four pickers in the same order as the site. Mood is limited to **3 per reel**; Occasion, Season and Setting have no extra limit beyond a sensible cap.
- Admin → Moods manages all four lists (add, rename, reorder, page text).
- Brand owners' own reel editing and the AI auto-tagging use the same four lists.

**Order of work**
1. Add the four filter types and new values (Holiday, Valentine's, Wedding, Celebration, seasons, settings).
2. In this draft only: load a sample copy of real reels as example data and run the remap, then show you before/after counts.
3. Switch the site, search, Stage, headline/carousel rules and admin over.
4. After you accept the draft, the same remap runs on your live reels once.

## B) Newsletter popup

Today it opens 12 seconds after a page loads, wherever the visitor is. New rules:
- Never opens while a filter panel, the search box, a reel popup or Stage is open; if one opens, it waits.
- Opens only after the visitor scrolls past the first 12 reels, or (desktop only) when the mouse heads for the top of the window to leave.
- Once per visitor: shown once, never again whether they subscribe or close it. Visitors who already closed or joined stay hidden.
- Same behaviour on Gravity Pants pages that show the popup.

## Technical details
- Add `moods.kind` (`mood|occasion|season|setting`, default `mood`), reuse `moods` table, families only for `mood`. Keep reel/brand `moods` text arrays as the single store so `directory_faceted_search` stays one query; facets are split by joining kind. Faceted search gets per-kind arrays and ANDs across kinds, ORs within.
- Migration: create `mood_remap_backup` (reel/brand id, original array), backfill new values, then UPDATE arrays via a mapping table with `array(select distinct ...)`; old `moods` rows for merged names are kept as aliases (`alias_of`) for URL redirects and search, not deleted. The existing rename-sync trigger is bypassed for this batch.
- `REEL_MOODS_MAX=3` applies to kind `mood` only, enforced in `saveReelMoods`, admin reel save and a trigger.
- URL params `mood`, `occasion`, `season`, `setting` in `parse-search.ts`/route validateSearch; legacy values mapped through aliases.
- Headline moods and carousel rules in `settings.ts` store `{kind, name}`; existing string entries read as kind from the catalog.
- Popup: shared `overlay-open` counter (filter sheet, search focus, ReelPopup, Stage) in a small store; `NewsletterPopup` replaces the 12 s timer with a sentinel after the 12th card plus `mouseout` to top on pointer:fine; one `localStorage` flag set on first show.
- Tests: remap table (each pair from your list), Mood 3-limit, AND/OR facet logic, legacy URL mapping, popup gating.
