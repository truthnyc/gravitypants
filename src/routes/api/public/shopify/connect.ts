import { createFileRoute } from "@tanstack/react-router";
import { encryptToken, exchangeAuthCode, isShopDomain, tokenExpiry, verifyOAuthHmac, verifyState } from "@/lib/shopify/shopify.server";

// Shopify sends the store owner back here after they approve "Connect your store" on Brand home.
// Trusted only after both Shopify's HMAC and our own signed state check out.
const back = (origin: string, status: string) => Response.redirect(`${origin}/app/brand-home?shopify=${status}`, 302);

export const Route = createFileRoute("/api/public/shopify/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.hostname === "localhost" ? url.protocol : "https:"}//${url.host}`;
        const apiKey = process.env["SHOPIFY_API_KEY"];
        const secret = process.env["SHOPIFY_API_SECRET"];
        const tokenKey = process.env["SHOPIFY_TOKEN_KEY"];
        if (!apiKey || !secret || !tokenKey) return back(origin, "error");
        const p = url.searchParams;
        const shop = p.get("shop") ?? "";
        const code = p.get("code") ?? "";
        if (!isShopDomain(shop) || !code || !(await verifyOAuthHmac(p, secret))) return back(origin, "error");
        const st = await verifyState(p.get("state") ?? "", secret);
        if (!st || st.shop !== shop) return back(origin, "expired");
        try {
          const pair = await exchangeAuthCode(shop, code, apiKey, secret);
          const fields = {
            access_token: await encryptToken(pair.access_token, tokenKey),
            refresh_token: pair.refresh_token ? await encryptToken(pair.refresh_token, tokenKey) : null,
            token_expires_at: tokenExpiry(pair.expires_in),
            refresh_token_expires_at: tokenExpiry(pair.refresh_token_expires_in),
            scopes: pair.scope,
            uninstalled_at: null,
            web_workspace_id: st.ws,
          };
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // One store per website workspace.
          await supabaseAdmin.from("shopify_shops").update({ web_workspace_id: null }).eq("web_workspace_id", st.ws).neq("shop_domain", shop);
          const { data: existing } = await supabaseAdmin.from("shopify_shops").select("id").eq("shop_domain", shop).maybeSingle();
          const { error } = existing
            ? await supabaseAdmin.from("shopify_shops").update(fields).eq("shop_domain", shop)
            : await supabaseAdmin.from("shopify_shops").insert({ shop_domain: shop, ...fields });
          if (error) throw error;
          return back(origin, "connected");
        } catch (e) {
          console.error("shopify web connect", shop, e);
          return back(origin, "error");
        }
      },
    },
  },
});
