# Roadmap

## Plans & team workspaces
- [x] Team plan in payments: team_monthly $175/mo, team_yearly $1,750/yr
- [x] plans table: simple 10 exports, business 50, team 150 shared, seats column
- [x] 7-day trial (3 exports, watermarked) — export_status, watermark in renderAt + ExportPage
- [x] Trial copy updated (pricing, welcome/trial-ended emails)
- [x] Team page (Account › Team): workspace list/switch, members, roles, remove, invite by email, pending invites resend/cancel
- [x] Invite email template + accept flow at /invite/$token
- [x] Create team workspace gated to Team plan

## Outstanding
- [ ] Publish (fixes email header on sent mail, activates lifecycle emails, syncs Team products to live)
- [ ] Live-check checkout, export limits, Customer Portal after publish

## Extra exports top-up (done)
- [x] 5 extra exports · $12.50 one-time, never expire (product extra_exports_pack / extra_exports_5)
- [x] workspace_billing.extra_exports + export_status/record_export spend extras after monthly limit
- [x] Webhook credits 5 extras on completed one-time payment (idempotent)
- [x] Top-up card on Account › Billing; extras shown on Export page; limit-reached sheet mentions top-up
