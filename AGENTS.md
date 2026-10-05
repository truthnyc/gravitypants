<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Stillframe architecture rules

- Routing uses TanStack Router file routes in `src/routes` (`ad.$id.edit.tsx` etc.), not React Router — the stack fixes the router.
- All project/frame reads and writes go through the hooks in `src/lib/stillframe/data.ts` so the editor can autosave from one place.
- Domain types and shared constants (workspace id, formats, defaults) live in `src/lib/stillframe/types.ts`.
- The `media` storage bucket is private; resolve image URLs with `getMediaUrl()` in `src/lib/stillframe/media.ts` (workspace policy blocks public buckets).
- Design tokens live only in `src/styles.css`; components use semantic classes (`bg-canvas`, `text-secondary-text`, `bg-control-fill`), never raw colors.
- Preview and export both draw through `renderAt()` in `src/render/renderFrame.ts`; never add a second drawing path — the look must match everywhere.
- Exports go to the private media bucket (500MB limit for GIFs), listed from storage.
- Export: finished files are kept 30 days; daily 03:00 UTC cleanup via /api/public/cleanup-exports (only removes expired files, so no caller secret).
- Accounts: authenticated routes call `ensure_workspace()`; the gate verifies membership before restoring a per-user workspace preference. Data reads `getWorkspaceId()`, not a constant — reloads preserve the selection safely.
- Privacy: RLS on every table via `is_workspace_member()`; media files live under `<workspace_id>/…` (exports at `<workspace_id>/exports/<project>/<stamp>/`) and storage policies check the first folder.
- Billing: per-workspace in `workspace_billing` (synced only by /api/public/payments/webhook), plans in `plans`; export gating via SQL `export_status`/`record_export` plus a restrictive storage policy on `<ws>/exports/` — the browser is never trusted for plan status.
- AI calls go through `src/lib/ai/gateway.server.ts`; the billing helper is `diagnoseBilling` in `billing-help.functions.ts`, owners/admins only.
- Brand kits: named kits live in `brand_kits` (logos in private `brand-assets` bucket, paths prefixed `brand-assets:` so `getMediaUrl` picks the bucket); ads link via `projects.brand_kit_id`; `effectiveKit()` merges the kit over the legacy `brand_kit` row, which now only holds workspace ad settings (placement, size, end card). Gating via SQL `brand_kits_enabled()` in RLS.
- Templates are photo-less styles; examples reuse `insertCopy`; imported system templates preserve per-slide overrides and logo visibility.

- Plan gates: every feature check goes through `usePlanAccess().canUse(feature)` in `src/lib/stillframe/plan.ts`; blocked features call `openUpgrade()` (one shared dialog) instead of hiding — one place for plan rules.
- Support: tickets in `support_tickets` via `submitTicket` server fn; priority set by SQL trigger from the plan (never the browser); each ticket emails help@gravitypants.com.

- Public art uses `public/site-art`; the Purl Soho video uses shared `FeaturedAdVideo` and CDN pointers, keeping site media separate from private workspace assets.
- Reusable kits: ads made from an `is_reusable` template store `projects.template_id`; `KitAgain.tsx` (useKit/KitAgainButton) drives the label, search and "Make another" (`/app/templates/$slug?from=<ad>` prefills text, no photos) from one place.
- Staff role: `user_roles` (enum app_role, admin) checked via `has_role()`; `is_platform_admin()` wraps it; staff area at `/admin` (`_authenticated/admin/`) 404s non-admins — roles never live on profiles.
- Site reels/homepage photos: private `site-reels` files, signed links; home banner/Example of the week in `site_settings`, bundled defaults. Project logos: light/dark artwork, per-frame visibility, auto/light/dark; drawn by `renderAt`.
- Brand requests: /contact saves to `brand_requests` (anon insert only) and emails help@gravitypants.com via the `brand-request` template.
- Free trial is usage-based (no time limit): SQL `export_status` returns `trial`, `watermark` (false only for the first export) and `clean_left`; the UI reads these flags, never `trial_ends_at`.

- Folder rules: see `AGENTS.md` in src/components/editor, src/render, src/lib/stillframe (billing details), src/lib/directory and src/routes/_authenticated/admin.
- Admin analytics: public visits go to `page_views` (anon insert) via `src/lib/site/track.ts`; sign-up UTM in user metadata; `analytics.server.ts` feeds the Analytics page and deduped Monday `/api/public/weekly-report`.
- Directory: all access via `src/lib/directory/directory.functions.ts` (see its AGENTS.md).
- One shared `SiteHeader` (`src/components/SiteHeader.tsx`, variant site|app) is the header everywhere except the editor; feature flags live in `src/lib/features.ts` (`SHOW_DIRECTORY` gates every Directory link) — headers can't drift and Directory ships when ready.
