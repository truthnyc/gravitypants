# Private admin area for platform admins

Built in three phases so each can be checked before the next. Design system unchanged.

## Phase 1 — Security foundation and admin shell
- Database helper `is_platform_admin()`; read-only policies letting admins see every workspace, ad, frame, photo, brand kit, billing row, export usage and media file.
- `admin_audit_log` table (admin, action, workspace, target, reason, time). Admins can read; nobody can edit or delete. Rows written only by server functions.
- Support editing: `support_sessions` table (admin, workspace, reason, expires 60 min). Write policies allow an admin to change a workspace only while a session is live; a trigger logs every write during it.
- Workspace fields: `suspended_at`, complimentary plan (`comp_plan`, `comp_until`).
- Export check updated: suspended = blocked; complimentary plan = allowed until its date; trials never export; workspaces owned by an admin always export.
- "Admin" item in the avatar menu (admins only). `/admin` area with its own sidebar; every page gated server-side, ordinary users get "Page not found".
- Suspended members see "Your account is paused, contact support".

## Phase 2 — Overview, Clients, client detail
- Overview: six stat cards (sign-ups 7d, active trials, paying clients, monthly revenue, exports this month, trials ending in 3 days), 30-day line chart of sign-ups and exports, "Trials ending soon" and "Payment problems" lists.
- Clients table with search and filters (plan, status, trial/paying, sign-up date) and all requested columns.
- Client detail: header with badges, "View Their Ads", "Edit as Support" (reason required, 60 min), members, read-only ads grid, billing (Stripe status, next invoice, recent invoices, "Open in Stripe"), usage.
- Opening a client's ad: the normal editor in read-only "Viewing as admin" mode with a thin banner; Export disabled unless support editing is on.
- Admin actions, each with confirmation + reason and logged: Extend trial (+7 / +15 / custom), Give free plan until a date, Reset this month's exports, Suspend / Unsuspend, Delete client (type the name; removes data and files; cancels Stripe subscription).

## Phase 3 — Exports, Admins, Audit Log
- Exports: searchable list across clients (client, ad, channels, formats, sizes, status, date); failed exports highlighted with their error. Needs a new `exports` record table written when an export starts/finishes/fails (today exports are only files in storage).
- Admins: list, "Add admin" by email (existing account), "Remove"; last admin can't be removed.
- Audit Log: filters (admin, client, action, date range), newest first.

## Technical details
- All admin reads/actions go through `createServerFn` with `requireSupabaseAuth` + an `is_platform_admin` check; privileged work (auth user emails, last sign-in, storage totals, deletes, Stripe calls) uses the admin client only after that check.
- Routes under `src/routes/_authenticated/admin/*`; admin layout does its own server check.
- Read-only editor: `readOnly` prop on `Editor` that disables autosave and editing.
- `kaktulun@mac.com` and `info@gravitypants.com` are already admins.
