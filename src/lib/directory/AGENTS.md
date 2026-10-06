- Sharing writes the append-only `permission_log` row in the same request as the listing, so a reel is never public without a recorded permission.
- Mood administration uses `moods.functions.ts` with server-verified staff access and audit logging; a database trigger synchronizes renamed/deleted names in brand/reel arrays atomically.
- Likes/favorites/shared favorites pages: `favorites.functions.ts` (like counts via service-only SQL `directory_like_counts`; public page only when `favorite_pages.is_public`, filtered by `brand_visible`).
- Directory page settings live in `site_settings` key `directory` (merged over defaults by `mergeSettings` in settings.ts); hand-picked featured reels in `directory_featured_reels`; featured selection is the pure `resolveFeatured()` so the admin preview and the site agree.

- Directory: `directory.functions.ts` lists; `moods.functions.ts` manages moods with sync triggers; categories are shared. Mood filters match exact reel/brand moods.
- Directory headline greeting: config in `site_settings` key `directory_greeting` (seeds in `greeting.ts`), one pure `chooseGreeting()` shared by site and admin preview; geo/weather via `getVisitorContext` (never stored); analytics in `directory_greeting_log`.
