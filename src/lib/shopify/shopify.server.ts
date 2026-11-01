// Shopify embedded-app helpers (server only). Multi-merchant: one offline token per shop.
export const SHOPIFY_API_VERSION = "2026-10";
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export const isShopDomain = (s: string) => SHOP_RE.test(s);

const enc = new TextEncoder();
const b64urlToBytes = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const bytesToB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

/** Verifies an App Bridge session token (HS256). Returns the shop domain. */
export async function verifySessionToken(token: string, apiKey: string, secret: string): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed session token");
  const [h, p, s] = parts as [string, string, string];
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  if (header.alg !== "HS256") throw new Error("Unexpected token algorithm");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(s), enc.encode(`${h}.${p}`));
  if (!ok) throw new Error("Invalid token signature");
  const c = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  const now = Math.floor(Date.now() / 1000);
  const skew = 5;
  if (c.aud !== apiKey) throw new Error("Token audience mismatch");
  if (typeof c.exp !== "number" || c.exp < now - skew) throw new Error("Token expired");
  if (typeof c.nbf === "number" && c.nbf > now + skew) throw new Error("Token not yet valid");
  const dest = new URL(String(c.dest)).hostname;
  if (!isShopDomain(dest)) throw new Error("Token destination is not a Shopify store");
  return dest;
}

async function aesKey(raw: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM", hash: "SHA-256" }, false, ["encrypt", "decrypt"]);
}
/** AES-256-GCM; stored as "v1:<iv>:<ciphertext>" (base64). */
export async function encryptToken(plain: string, keyRaw: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(keyRaw), enc.encode(plain)));
  return `v1:${bytesToB64(iv)}:${bytesToB64(ct)}`;
}
export async function decryptToken(stored: string, keyRaw: string) {
  const [, iv = "", ct = ""] = stored.split(":");
  const toB = (x: string) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toB(iv) }, await aesKey(keyRaw), toB(ct));
  return new TextDecoder().decode(pt);
}

/** Offline token pair as returned by Shopify's token endpoint. */
export type OfflineTokenPair = {
  access_token: string;
  scope: string | null;
  refresh_token: string | null;
  /** seconds the access token stays valid, or null when Shopify did not say */
  expires_in: number | null;
  /** seconds the refresh token stays valid, or null when Shopify did not say */
  refresh_token_expires_in: number | null;
};

/** ISO timestamp `seconds` from now, or null when Shopify did not send a lifetime. */
export const tokenExpiry = (seconds: number | null) => (seconds && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function parsePair(json: Record<string, unknown>): OfflineTokenPair {
  return {
    access_token: String(json["access_token"] ?? ""),
    scope: str(json["scope"]),
    refresh_token: str(json["refresh_token"]),
    expires_in: num(json["expires_in"]),
    refresh_token_expires_in: num(json["refresh_token_expires_in"]),
  };
}

// Shopify's documented shape for these grants is a form-encoded POST.
async function postToken(shop: string, body: Record<string, string>) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json?.["access_token"]) {
    const why = str(json?.["error_description"]) ?? str(json?.["error"]) ?? `HTTP ${res.status}`;
    throw new Error(`Token exchange failed (${res.status}): ${why.slice(0, 160)}`);
  }
  return parsePair(json);
}

/**
 * Exchanges an App Bridge session token for an expiring offline token.
 * `expiring=1` is required: Shopify rejects non-expiring offline tokens for the Admin API.
 */
export async function exchangeOfflineToken(shop: string, sessionToken: string, apiKey: string, secret: string) {
  return postToken(shop, {
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: apiKey,
    client_secret: secret,
    subject_token: sessionToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    expiring: "1",
  });
}

/**
 * Swaps a stored non-expiring offline token for an expiring pair.
 * Permanently invalidates the old token, so the caller must store the result.
 */
export async function migrateOfflineToken(shop: string, nonExpiringToken: string, apiKey: string, secret: string) {
  return postToken(shop, {
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: apiKey,
    client_secret: secret,
    subject_token: nonExpiringToken,
    subject_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    expiring: "1",
  });
}

/** Trades a refresh token for a fresh access + refresh pair (the refresh token rotates). */
export async function refreshOfflineToken(shop: string, refreshToken: string, apiKey: string, secret: string) {
  return postToken(shop, {
    grant_type: "refresh_token",
    client_id: apiKey,
    client_secret: secret,
    refresh_token: refreshToken,
  });
}

export async function adminGraphql<T>(shop: string, accessToken: string, query: string, variables?: unknown): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify GraphQL failed (${res.status})`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors).slice(0, 300)}`);
  return json.data as T;
}

// Admin API only. TODO: shop.brand (logo, squareLogo, colors) is a Storefront API
// field and does not exist in the Admin schema — fetch branding there in a later step.
export const SHOP_BRAND_QUERY = `query ShopBasics { shop { name myshopifyDomain primaryDomain { url } } }`;

// ---- Website "Connect your store" (OAuth authorization code grant) ----
export const WEB_SCOPES = "read_products,write_products,unauthenticated_read_product_listings";

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
const sameHex = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

/** Accepts "mystore", "mystore.myshopify.com" or a store admin URL; returns the domain or null. */
export function normalizeShop(input: string): string | null {
  let s = input.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  const admin = input.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
  if (admin?.[1]) s = admin[1].toLowerCase();
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return isShopDomain(s) ? s : null;
}

export type ConnectState = { ws: string; uid: string; shop: string; exp: number };
export async function signState(st: ConnectState, secret: string) {
  const p = b64url(JSON.stringify(st));
  return `${p}.${await hmacHex(secret, `state:${p}`)}`;
}
export async function verifyState(token: string, secret: string, now = Date.now()): Promise<ConnectState | null> {
  const [p, sig] = token.split(".");
  if (!p || !sig || !sameHex(sig, await hmacHex(secret, `state:${p}`))) return null;
  try {
    const st = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))) as ConnectState;
    return st.exp > now ? st : null;
  } catch {
    return null;
  }
}

/** Shopify signs OAuth callbacks: hex HMAC-SHA256 of the other query params, sorted. */
export async function verifyOAuthHmac(params: URLSearchParams, secret: string) {
  const given = params.get("hmac") ?? "";
  const msg = [...params.entries()].filter(([k]) => k !== "hmac" && k !== "signature").sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&");
  return given !== "" && sameHex(given.toLowerCase(), await hmacHex(secret, msg));
}

/** Trades an OAuth code for an expiring offline token pair. */
export async function exchangeAuthCode(shop: string, code: string, apiKey: string, secret: string) {
  return postToken(shop, { client_id: apiKey, client_secret: secret, code, expiring: "1" });
}
