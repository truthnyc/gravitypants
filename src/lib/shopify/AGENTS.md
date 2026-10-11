# Shopify app rules
- Embedded app lives at /shopify; auth is App Bridge session tokens only (no cookies/localStorage) so it works in third-party iframes.
- Server endpoints are TanStack routes under /api/public/shopify/* (not edge functions) and must verify the session token before anything else.
- Offline tokens live AES-GCM encrypted (SHOPIFY_TOKEN_KEY) in `shopify_shops`, which has no RLS policies: service role only.
- `billing_source` is set by a SQL trigger from the linked user's paid web plan, never by app code.
- src/server.ts sets the per-shop `frame-ancestors` CSP for /shopify, because Shopify rejects meta-tag CSP.
- Admin API is GraphQL only, version pinned in SHOPIFY_API_VERSION.
