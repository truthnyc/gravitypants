# Rules for this folder
- Website reel descriptions persist on `site_reels` through staff-checked saves and public published reads, so popups always show edited copy.
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.

- Export history lives in the `exports` table (status/error/bytes) for the admin Exports list; files themselves stay in storage.
- Price→plan mapping lives only in `src/lib/stillframe/plan-map.ts` (webhook, portal, tests share it); the `workspace_billing_plan_check` constraint must list every plan there — a missing value silently drops paid plans.
- Billing uses `peekWorkspaceId()`, refuses duplicate subscriptions server-side, and switches via Manage Billing; `signup-choice.ts` stores only a per-user suggestion, never paid access.
- Pre-release billing checks: `bun run test` (unit) and `bun run check:billing` (test-mode checkout per plan, portal, plan change, DB plan values).
- Export sizes and platform shortcuts live only in `export-sizes.ts`; 4:5 and custom shapes render via `renderAt` with the nearest built-in layout — one config, no second drawing path.
- Main size: `projects.primary_format` is the ad's main size; `main-size.ts` holds the five size names and `refitForMainSize`; header `AdPills` changes it on every step; preview size is temporary UI state.
- Plan gates: every feature check goes through `usePlanAccess().canUse(feature)` in `src/lib/stillframe/plan.ts`; blocked features call `openUpgrade()` (one shared dialog) instead of hiding — one place for plan rules.
- Templates are photo-less styles; examples reuse `insertCopy`; imported system templates preserve per-slide overrides and logo visibility.
- Klaviyo: each workspace's own private key is stored AES-GCM encrypted (KLAVIYO_TOKEN_KEY) in service-only `klaviyo_connections`; `klaviyo.functions.ts` verifies membership and sends GIFs via Klaviyo import_from_url with a user-signed storage link, so keys never reach the browser.
- Client reel page `/app/reel/$key` (keys from Brand home) is served by `client-reel.functions.ts`: membership check, then brand-ownership check before any service read, so clients only see and download their own reels; movement wording comes from `movement-label.ts`.
- "Create from a product link" (/app/new): one server entry `draftReelsFromUrl` in `url-reel.server.ts` (paid-gated wrapper `url-reel.functions.ts`, pure rules in `url-reel.ts`) reads the page, stores photos under `<ws>/photo/` as the caller and returns three drafts on different templates; the browser only turns a picked draft into an ad, so the MCP connector can reuse the same function.
- Product-link drafts first build a checked product brief (`buildBrief`): page text from `productText`, photos ≥600 px short side, caller-scoped brand voice; any fact whose quote is not found in the page text is dropped in code, so stories never rest on invented claims.
- Product-link stories use the data-defined `STORY_SHAPES`; `allowedShapes` limits them to what the brief supports, and pure `checkDraft` (photos, facts, headline length, banned phrases, repeats, prices) rejects drafts in code with one replacement request before `fallbackDraft`, so quality rules never rely on the prompt alone.
