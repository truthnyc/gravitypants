# Shopify step 2: pick products, reel is ready

## Flow
1. `/shopify` shows "Make a reel". It calls `shopify.resourcePicker({ type: 'product', multiple: 10 })`. If more than 10 are picked, only the first 10 are kept and a note says so.
2. The picked IDs and the session token go to `POST /api/public/shopify/products`. The route verifies the token, decrypts the offline token and runs the `PickedProducts` query exactly as you gave it (2026-10).
3. On the server: copy each image into the private media bucket under `<workspace_id>/shopify/<stamp>/...`. Then create a `projects` row plus `frames` rows by applying the default template through the same template-doc code the editor uses. Photos go in picked order, product title is the headline, the formatted min price is the subline, and the shop name is the sign-off. Main size is 9:16.
4. The route returns `{ projectId }`. `/shopify/reel/$id` then shows the preview with "Edit words", "Change template" and "Export MP4/GIF".

## Answers

**a. Who owns the reels.** I agree with your suggestion. On first install (or on the first products call), one workspace is created per shop. Its id is stored in a new `shopify_shops.workspace_id` column. That workspace has no member users, and RLS stays as it is, so nobody reaches it through the browser client. Only shop-verified server routes reach it. Later, account linking (out of scope here) will either move the shop's workspace under a user or merge its rows into their workspace. Because every row already carries `workspace_id`, that is a single re-point. Billing keeps reading `billing_source`. Export allowance uses the existing `export_status`/`record_export` against the shop's workspace. Aimanté opt-in stays off and nothing is published to the Directory.

**b. Does the editor need browser sign-in?** Yes. `data.ts`, `media.ts` and `ExportPage` call the browser database client directly: `from("projects"/"frames")`, storage upload and signed URLs, and `rpc("record_export")`. They depend on a signed-in session plus `getWorkspaceId()`, so they won't work inside the iframe as they are. The fix keeps the same data shapes and swaps where they come from:
- New shop-scoped server routes under `/api/public/shopify/*`. Each one verifies the session token first, then acts on that shop's workspace only, using the service role:
  - `reel` (GET project + frames + signed media URLs)
  - `reel/update` (headline/subline/sign-off text, template swap)
  - `export/start` (calls `export_status` / `record_export`; returns a signed upload URL for `<ws>/exports/<project>/<stamp>/`)
  - `export/download` (signed URL)
- The Shopify pages are small screens that hand that data to the existing `renderAt` preview and the export pipeline. In step 2 I don't embed the full `/app` editor: "Edit words" is a three-field panel and "Change template" is a size-filtered template list. The full editor in the iframe comes later, once `data.ts` gets a pluggable data source.

**c. Where export runs.** In the browser. `exportMedia.ts` draws frames with `renderAt` and encodes with ffmpeg.wasm. Iframe risks:
- ffmpeg.wasm needs the wasm/core files to load cross-origin inside the admin iframe. If the build uses the multi-threaded core, that needs `SharedArrayBuffer` / cross-origin isolation, which Shopify's admin frame won't give us. **The first build step is to check which core is used.** If it's multi-threaded, the Shopify area uses the single-threaded core (slower, but it works).
- Downloads from inside the iframe: a plain `<a download>` with a signed URL can be blocked. We'll open the file through `window.open` (App Bridge allows this) and also show a link.
- Memory: long GIFs can be heavy. The existing 500MB limit and quality defaults stay.

**d. Reused vs new**

Reused unchanged:
- `src/render/renderFrame.ts`, `exportMedia.ts`, `formats.ts`, `images.ts`
- `format-settings.ts`, `template-doc.ts`, `types.ts`, `main-size.ts`
- export-quality/size/estimate rules
- SQL `export_status` / `record_export`, `shopify.server.ts` (token verify, decrypt, GraphQL)

New:
- Migration: `shopify_shops.workspace_id` plus a server-only `ensure_shop_workspace(shop)` private definer.
- `src/lib/shopify/reel.server.ts`: image copy, project creation from the template, price formatting.
- Server routes `src/routes/api/public/shopify/products.ts`, `reel.ts`, `reel.update.ts`, `export.start.ts`, `export.download.ts`.
- Pages `src/routes/shopify.reel.$id.tsx` and a "Make a reel" button in `shopify.tsx`.
- A small `shopifyFetch()` client helper that attaches `await shopify.idToken()` on every call.
- A test for the rules: max 10 products, price formatting, photo order, and the token's shop matching the workspace.

## Your call before I build
- Default template: I'll use the first reusable 9:16 template unless you name one.
- Products with no images are skipped with a notice. If none have images, an error is shown.
- Required scope: `read_products`. Please confirm it's in your app's scopes.

## Technical notes
- Every route rejects a token whose `dest` shop has no row, and scopes every query by that shop's `workspace_id`. The browser never sends a workspace id.
- Image copy: fetch from cdn.shopify.com server-side, check content type and size limits, run SVG files through `svg-safety.ts`.
- Rate limits: the GraphQL cost is small (10 nodes × 10 media). On a throttle error we retry once.
