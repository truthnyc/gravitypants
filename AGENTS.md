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
- Finished exports are uploaded to the private media bucket at `<workspace_id>/exports/<project-id>/<timestamp>/<file>` (bucket limit raised to 500MB for GIFs) and listed from storage, not a table.
- Export: finished files are kept 30 days; daily 03:00 UTC cleanup via /api/public/cleanup-exports (only removes expired files, so no caller secret).
- Accounts: authenticated routes call `ensure_workspace()`; the gate verifies membership before restoring a per-user workspace preference. Data reads `getWorkspaceId()`, not a constant — reloads preserve the selection safely.
- Privacy: RLS on every table via `is_workspace_member()`; media files live under `<workspace_id>/…` (exports at `<workspace_id>/exports/<project>/<stamp>/`) and storage policies check the first folder.
- Billing: per-workspace in `workspace_billing` (synced only by /api/public/payments/webhook), plans in `plans`; export gating via SQL `export_status`/`record_export` plus a restrictive storage policy on `<ws>/exports/` — the browser is never trusted for plan status.
- Export history lives in the `exports` table (status/error/bytes) for the admin Exports list; files themselves stay in storage.
- Price→plan mapping lives only in `src/lib/stillframe/plan-map.ts` (webhook, portal, tests share it); the `workspace_billing_plan_check` constraint must list every plan there — a missing value silently drops paid plans.
- Billing uses `peekWorkspaceId()`, refuses duplicate subscriptions server-side, and switches via Manage Billing; `signup-choice.ts` stores only a per-user suggestion, never paid access.
- Pre-release billing checks: `bun run test` (unit) and `bun run check:billing` (test-mode checkout per plan, portal, plan change, DB plan values).
- AI calls go through `src/lib/ai/gateway.server.ts`; the billing helper is `diagnoseBilling` in `billing-help.functions.ts`, owners/admins only.
- Brand kits: named kits live in `brand_kits` (logos in private `brand-assets` bucket, paths prefixed `brand-assets:` so `getMediaUrl` picks the bucket); ads link via `projects.brand_kit_id`; `effectiveKit()` merges the kit over the legacy `brand_kit` row, which now only holds workspace ad settings (placement, size, end card). Gating via SQL `brand_kits_enabled()` in RLS.
- Templates: `templates` are photo-less styles; gallery examples map to them in `example-template.ts`, then reuse `insertCopy` so user photos remain private. Save needs `brand_kits_enabled`, sharing needs `workspace_is_team()` in RLS.

- Plan gates: every feature check goes through `usePlanAccess().canUse(feature)` in `src/lib/stillframe/plan.ts`; blocked features call `openUpgrade()` (one shared dialog) instead of hiding — one place for plan rules.
- Support: tickets in `support_tickets` via `submitTicket` server fn; priority set by SQL trigger from the plan (never the browser); each ticket emails help@gravitypants.com.

- Public art uses `public/site-art`; the Purl Soho video uses shared `FeaturedAdVideo` and CDN pointers, keeping site media separate from private workspace assets.
- Reusable kits: ads made from an `is_reusable` template store `projects.template_id`; `KitAgain.tsx` (useKit/KitAgainButton) drives the label, search and "Make another" (`/app/templates/$slug?from=<ad>` prefills text, no photos) from one place.
- Staff role: `user_roles` (enum app_role, admin) checked via `has_role()`; `is_platform_admin()` wraps it; staff area at `/admin` (`_authenticated/admin/`) 404s non-admins — roles never live on profiles.
- Website reels use private `site-reels` files with signed links. Project logos support light/dark artwork plus per-frame visibility and auto/light/dark selection; `renderAt` handles preview/export.
- Brand requests: /contact saves to `brand_requests` (anon insert only) and emails help@gravitypants.com via the `brand-request` template.
- Free trial is usage-based (no time limit): SQL `export_status` returns `trial`, `watermark` (false only for the first export) and `clean_left`; the UI reads these flags, never `trial_ends_at`.

- Folder rules: see `AGENTS.md` in src/components/editor, src/render, src/lib/stillframe and src/routes/_authenticated/admin.
