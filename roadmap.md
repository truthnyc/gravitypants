# Roadmap

## Auth pages
- [x] Match uploaded desktop/mobile sign-up and sign-in layouts
- [x] Connect signup welcome, selected plan, example style, reset, and sign-in controls
- [ ] Verify signed-in first-ad flow (blocked: no matching preview auth account for requester)

## Workspace creation error
- [x] Allow creators to join a new workspace as its owner
- [x] Keep the chosen workspace selected across page reloads, after verifying membership

## Team-only navigation
- [x] Show team templates and Account Team tab only for active Team workspaces

## New ad flow
- [x] Make the post-photo choice clear: one primary fresh-ad action, with saved looks grouped only when available

## Plans & team workspaces
- [x] Team plan in payments: team_monthly $175/mo, team_yearly $1,750/yr
- [x] plans table: simple 10 exports, business 50, team 150 shared, seats column
- [x] 7-day trial (3 exports, watermarked) — export_status, watermark in renderAt + ExportPage
- [x] Trial copy updated (pricing, welcome/trial-ended emails)
- [x] Team page (Account › Team): workspace list/switch, members, roles, remove, invite by email, pending invites resend/cancel
- [x] Invite email template + accept flow at /invite/$token
- [x] Create team workspace gated to Team plan

## Outstanding
- [x] Default photo darkening off; add admin template photo crop/zoom and replaceable logos
- [ ] Publish (fixes email header on sent mail, activates lifecycle emails, syncs Team products to live)
- [ ] Live-check checkout, export limits, Customer Portal after publish

## Extra exports top-up (done)
- [x] 5 extra exports · $12.50 one-time, never expire (product extra_exports_pack / extra_exports_5)
- [x] workspace_billing.extra_exports + export_status/record_export spend extras after monthly limit
- [x] Webhook credits 5 extras on completed one-time payment (idempotent)
- [x] Top-up card on Account › Billing; extras shown on Export page; limit-reached sheet mentions top-up

## Billing reliability
- [x] Team plans saved correctly (database fix); duplicate test subscriptions removed
- [x] Block buying a second plan; billing follows the active workspace
- [x] Automated billing checks (unit + test-mode end-to-end)
- [x] Billing helper (AI) on Account › Billing
- [x] Billing page shows plan, renewal date, exports left; refreshes when you return from Manage Billing
- [ ] Publish so the live site gets these fixes

## Public website foundation
- [x] Public shell and routes at /, /features, /examples, /pricing
- [x] Move app pages to /app and update internal navigation/auth return paths
- [x] Add reference-based site tokens and reusable ReelPhone; verify public and app flows

## Public home page
- [x] Rebuild desktop and mobile reference sections and interactions; verify responsive flow

## Public features page
- [x] Rebuild reference sections, mobile layouts, jump links, and animations; verify at phone and desktop widths

## Public examples page
- [x] Rebuild reference gallery, responsive reels, featured example, shareable filters and signup links
- [x] Show the supplied Purl Soho ad in the featured example and home-page phone, with poster frames and playback controls
- [x] Replace decorative source tiles and extracted video stills with the three original Purl Soho photos

## Editor save and frame logos
- [x] Diagnose and fix editor autosave showing “Not saved”
- [x] Add per-frame logo visibility when “This frame” is selected
- [x] Support light and dark logo files with per-frame version selection
- [ ] Verify preview/export match and editor saving persists after reload
- [x] Tighten site-reels storage reads to signed-link access only
