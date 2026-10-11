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
  const [h, p, s] = parts;
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
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
/** AES-256-GCM; stored as "v1:<iv>:<ciphertext>" (base64). */
export async function encryptToken(plain: string, keyRaw: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(keyRaw), enc.encode(plain)));
  return `v1:${bytesToB64(iv)}:${bytesToB64(ct)}`;
}
export async function decryptToken(stored: string, keyRaw: string) {
  const [, iv, ct] = stored.split(":");
  const toB = (x: string) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toB(iv) }, await aesKey(keyRaw), toB(ct));
  return new TextDecoder().decode(pt);
}

export async function exchangeOfflineToken(shop: string, sessionToken: string, apiKey: string, secret: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: secret,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  return (await res.json()) as { access_token: string; scope: string };
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

export const SHOP_BRAND_QUERY = `query ShopBrand {
  shop {
    name
    brand {
      logo { image { url } }
      squareLogo { image { url } }
      colors {
        primary { background foreground }
        secondary { background foreground }
      }
    }
  }
}`;
