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
- The editor holds one in-memory document with undo history (`src/components/editor/use-editor.ts`) and autosaves diffs via `saveEditorDoc` in `data.ts`.
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.
- Font loading for canvas goes through `loadFont()` in `src/lib/stillframe/fonts.ts` (css2 per weight, uploaded fonts via FontFace) so `ensureFonts` never renders with a fallback.
- Slider drags use undo keys prefixed `drag:` which coalesce regardless of time, so one drag = one undo step.
- Export runs in the browser (`src/render/exportMedia.ts`): MP4 via WebCodecs + Mediabunny with ffmpeg.wasm (lazy, from CDN) as fallback, GIF via ffmpeg.wasm two-pass palette — no server rendering, so output always matches renderAt.
- Finished exports are uploaded to the private media bucket at `<workspace_id>/exports/<project-id>/<timestamp>/<file>` (bucket limit raised to 500MB for GIFs) and listed from storage, not a table.
- Export: finished files are kept 30 days; daily 03:00 UTC cleanup via /api/public/cleanup-exports (only removes expired files, so no caller secret).
- Accounts: app routes live under `src/routes/_authenticated/` (ssr:false gate → /signin?redirect=); the gate calls RPC `ensure_workspace()` and stores the id via `setWorkspaceId` in `src/lib/stillframe/workspace.ts` — data code reads `getWorkspaceId()`, never a constant, so each user only touches their workspace.
- Privacy: RLS on every table via `is_workspace_member()`; media files live under `<workspace_id>/…` (exports at `<workspace_id>/exports/<project>/<stamp>/`) and storage policies check the first folder.
- Billing: per-workspace in `workspace_billing` (synced only by /api/public/payments/webhook), plans in `plans`; export gating via SQL `export_status`/`record_export` plus a restrictive storage policy on `<ws>/exports/` — the browser is never trusted for plan status.
- Admin: `/admin` under `_authenticated/admin/` gated by `checkAdmin`; every admin read/action is a server fn in `src/lib/stillframe/admin.functions.ts` that checks `is_platform_admin()` before using the service-role client, and logs to `admin_audit_log` — never trust hidden buttons.
- Support editing: time-boxed `support_sessions` rows grant write RLS via `has_support_session()`; a trigger logs each write. Other workspaces' ads open read-only in the normal editor.
- Export history lives in the `exports` table (status/error/bytes) for the admin Exports list; files themselves stay in storage.
- Price→plan mapping lives only in `src/lib/stillframe/plan-map.ts` (webhook, portal, tests share it); the `workspace_billing_plan_check` constraint must list every plan there — a missing value silently drops paid plans.
- Billing reads/actions use the active workspace (`peekWorkspaceId()`), and new subscriptions are refused server-side when one is already active — plan changes only via Manage Billing.
- Pre-release billing checks: `bun run test` (unit) and `bun run check:billing` (test-mode checkout per plan, portal, plan change, DB plan values).
- AI calls go through `src/lib/ai/gateway.server.ts` (Responses, openai/gpt-6-astra, streamed, instructions via `system`); the billing helper is `diagnoseBilling` in `billing-help.functions.ts`, owners/admins only.
