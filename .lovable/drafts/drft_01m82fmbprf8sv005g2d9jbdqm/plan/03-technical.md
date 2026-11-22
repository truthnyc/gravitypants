## Technical details

**Settings (`site_settings`, `src/lib/directory/settings.ts`)** — no new table.
- `autoLoadPages` default 3 → 2, and update the saved value (currently 0) to 2.
- `headlineMoods: string[]` → `{ mood, until: "YYYY-MM-DD" | null }[]`; parser accepts the old string list so saved settings keep working. Pure `activeHeadlineMoods(list, today)` helper plus a test (Black Friday until 2026-11-30 shows on the 30th, gone on Dec 1).
- `comingSoon` toggle: removed from public behaviour; admin always shows empty categories.

**Search function** — new migration replacing `directory_faceted_search` (same name and arguments):
- Filter logic unchanged: OR within a group (`&&` / `= any`), AND across groups.
- Add `s.tags` to Showcase reels' `extra_text`.
- Facet counts already computed; zero-count values filtered in `FilterBar.tsx` (`CategoryBody` "Coming soon" group removed for visitors).

**Files**
- `src/lib/directory/settings.ts`, `src/lib/directory/directory.functions.ts` (category list ~line 937 filters empties for public calls)
- `src/components/directory/FilterBar.tsx` — counts, hide zeros
- `src/routes/directory.index.tsx` — headline rotation (~475), auto-load observer (~533, ~990) starting on scroll
- `src/components/directory/DirectoryGrid.tsx` / `HoverReelPreview.tsx` — shared in-view play/pause hook (`useInViewPlayback`), reused on brand/category/mood/Brands pages
- `src/routes/aimante.brands*.tsx` — hide empty categories
- `src/routes/_authenticated/admin/directory-settings.tsx`, `src/components/admin/HeadlineCard.tsx` — date per mood, Coming soon label
- Tests: `tests/directory-settings.test.ts` (headline end dates, auto-load default)
- Update memory: filter counts allowed again.
