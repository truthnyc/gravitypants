// Resolves an App Bridge session token to the shop's own workspace. Every /api/public/shopify/* route
// (except auth) starts here; the browser never sends a workspace id.
import { decryptToken, encryptToken, migrateOfflineToken, refreshOfflineToken, tokenExpiry, verifySessionToken } from "./shopify.server";
import { tokenAction } from "./token-state";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export class ShopError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const RECONNECT = "Open Gravity Pants from your Shopify admin to reconnect your store.";

// One refresh per shop at a time: Shopify warns that two workers refreshing the same store
// can leave one holding a token the other already replaced.
const inFlight = new Map<string, Promise<string>>();

const ms = (v: unknown) => (typeof v === "string" && v ? Date.parse(v) : null);

export async function shopFromRequest(request: Request) {
  const apiKey = process.env["SHOPIFY_API_KEY"];
  const secret = process.env["SHOPIFY_API_SECRET"];
  const tokenKey = process.env["SHOPIFY_TOKEN_KEY"];
  if (!apiKey || !secret || !tokenKey) throw new ShopError("Shopify app is not configured yet.", 503);
  const auth = request.headers.get("authorization") ?? "";
  let shop: string;
  try {
    shop = await verifySessionToken(auth.startsWith("Bearer ") ? auth.slice(7) : "", apiKey, secret);
  } catch (e) {
    throw new ShopError((e as Error).message, 401);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("shopify_shops")
    .select("shop_domain, access_token, refresh_token, token_expires_at, refresh_token_expires_at, uninstalled_at, workspace_id")
    .eq("shop_domain", shop)
    .maybeSingle();
  if (!row || row.uninstalled_at) throw new ShopError("Open Gravity Pants from your Shopify admin to reconnect your store.", 403);
  let ws = row.workspace_id as string | null;
  if (!ws) {
    const { data, error } = await supabaseAdmin.rpc("ensure_shop_workspace" as never, { _shop: shop } as never);
    if (error || !data) throw new ShopError("Could not set up your store's space.", 500);
    ws = data as unknown as string;
  }

  const accessToken = tokenGetter(supabaseAdmin, row, { apiKey, secret, tokenKey });

  return { shop, ws, admin: supabaseAdmin, accessToken };
}

export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ShopError) return json({ error: e.message }, e.status);
    console.error("shopify route", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

/** Published Gravity Pants templates that can open in 9:16, featured first. */
export async function listTemplates(admin: Awaited<ReturnType<typeof shopFromRequest>>["admin"]) {
  const { data } = await admin
    .from("templates")
    .select("*")
    .eq("source", "system")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });
  return (data ?? []).filter((t) => ((t.settings as { primary_format?: string } | null)?.primary_format ?? t.format ?? "9:16") === "9:16" && ((t.settings as { frames?: unknown[] } | null)?.frames?.length ?? 0) > 0);
}

type ShopRow = { shop_domain: string; access_token: string; refresh_token: string | null; token_expires_at: string | null; refresh_token_expires_at: string | null };
type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Returns a function giving a usable Admin API token for this shop (stored, migrated or refreshed). Shared by the embedded app and Brand home. */
export function tokenGetter(supabaseAdmin: Admin, row: ShopRow, creds: { apiKey: string; secret: string; tokenKey: string }) {
  const { apiKey, secret, tokenKey } = creds;
  const shop = row.shop_domain;
  const save = async (pair: { access_token: string; refresh_token: string | null; scope: string | null; expires_in: number | null; refresh_token_expires_in: number | null }) => {
    await supabaseAdmin
      .from("shopify_shops")
      .update({
        access_token: await encryptToken(pair.access_token, tokenKey),
        refresh_token: pair.refresh_token ? await encryptToken(pair.refresh_token, tokenKey) : null,
        token_expires_at: tokenExpiry(pair.expires_in),
        refresh_token_expires_at: tokenExpiry(pair.refresh_token_expires_in),
        scopes: pair.scope,
      })
      .eq("shop_domain", shop);
  };

  /** A usable Admin API token for this shop: stored one, or a migrated/refreshed replacement. */
  const accessToken = async (): Promise<string> => {
    const action = tokenAction({
      hasToken: Boolean(row.access_token),
      expiresAt: ms(row.token_expires_at),
      refreshExpiresAt: ms(row.refresh_token_expires_at),
    });
    if (action === "stored") return decryptToken(row.access_token, tokenKey);
    if (action === "reauthorize") throw new ShopError(RECONNECT, 403);

    const running = inFlight.get(shop);
    if (running) return running;

    const job = (async () => {
      try {
        if (action === "migrate") {
          const legacy = await decryptToken(row.access_token, tokenKey);
          try {
            const pair = await migrateOfflineToken(shop, legacy, apiKey, secret);
            await save(pair);
            return pair.access_token;
          } catch (e) {
            console.error("shopify token migration failed", shop, e);
            throw new ShopError(RECONNECT, 403);
          }
        }
        const rt = row.refresh_token ? await decryptToken(row.refresh_token, tokenKey) : null;
        if (!rt) throw new ShopError(RECONNECT, 403);
        try {
          const pair = await refreshOfflineToken(shop, rt, apiKey, secret);
          await save(pair);
          return pair.access_token;
        } catch (e) {
          console.error("shopify token refresh failed", shop, e);
          throw new ShopError(RECONNECT, 403);
        }
      } finally {
        inFlight.delete(shop);
      }
    })();
    inFlight.set(shop, job);
    return job;
  };

  return accessToken;
}
