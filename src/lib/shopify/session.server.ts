// Resolves an App Bridge session token to the shop's own workspace. Every /api/public/shopify/* route
// (except auth) starts here; the browser never sends a workspace id.
import { decryptToken, verifySessionToken } from "./shopify.server";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export class ShopError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

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
    .select("shop_domain, access_token, uninstalled_at, workspace_id")
    .eq("shop_domain", shop)
    .maybeSingle();
  if (!row || row.uninstalled_at) throw new ShopError("Open Gravity Pants from your Shopify admin to reconnect your store.", 403);
  let ws = row.workspace_id as string | null;
  if (!ws) {
    const { data, error } = await supabaseAdmin.rpc("ensure_shop_workspace" as never, { _shop: shop } as never);
    if (error || !data) throw new ShopError("Could not set up your store's space.", 500);
    ws = data as unknown as string;
  }
  return {
    shop,
    ws,
    admin: supabaseAdmin,
    accessToken: () => decryptToken(row.access_token, tokenKey),
  };
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
