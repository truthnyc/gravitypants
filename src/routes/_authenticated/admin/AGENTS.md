# Rules for this folder
- Admin: `/admin` under `_authenticated/admin/` gated by `checkAdmin`; every admin read/action is a server fn in `src/lib/stillframe/admin.functions.ts` that checks `is_platform_admin()` before using the service-role client, and logs to `admin_audit_log` — never trust hidden buttons.
- Support editing: time-boxed `support_sessions` rows grant write RLS via `has_support_session()`; a trigger logs each write. Other workspaces' ads open read-only in the normal editor.
- Admin templates: system templates use versioned drafts, JSON crop/logo settings copied into ads, renderAt previews, and central plan gates.
