import { createFileRoute } from "@tanstack/react-router";
import {
  adminGraphql,
  encryptToken,
  exchangeOfflineToken,
  SHOP_BRAND_QUERY,
  verifySessionToken,
} from "@/lib/shopify/shopify.server";

type ShopBasics = {
  shop: {
    name: string;
    myshopifyDomain: string;
    primaryDomain: { url: string };
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Public route, but every call must carry a valid App Bridge session token signed with our app secret.
export const Route = createFileRoute("/api/public/shopify/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["SHOPIFY_API_KEY"];
        const secret = process.env["SHOPIFY_API_SECRET"];
        const tokenKey = process.env["SHOPIFY_TOKEN_KEY"];
        if (!apiKey || !secret || !tokenKey) return json({ error: "Shopify app is not configured yet." }, 503);

        const auth = request.headers.get("authorization") ?? "";
        const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        let shop: string;
        try {
          shop = await verifySessionToken(sessionToken, apiKey, secret);
        } catch (e) {
          return json({ error: (e as Error).message }, 401);
        }

        let access_token: string;
        let scope: string;
        try {
          ({ access_token, scope } = await exchangeOfflineToken(shop, sessionToken, apiKey, secret));
        } catch (e) {
          console.error("shopify-auth exchange", e);
          return json({ error: (e as Error).message }, 502);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("shopify_shops").upsert(
            {
              shop_domain: shop,
              access_token: await encryptToken(access_token, tokenKey),
              scopes: scope,
              uninstalled_at: null,
            },
            { onConflict: "shop_domain" },
          );
          if (error) throw new Error(`Could not save shop: ${error.message}`);
        } catch (e) {
          console.error("shopify-auth save", e);
          return json({ error: (e as Error).message }, 502);
        }

        // The install already succeeded: everything below is optional, so a failed
        // lookup must never surface to the merchant as "Couldn't connect".
        // TODO: real branding (logo, squareLogo, colors) lives in shop.brand on the
        // Storefront API, not the Admin API — fetch it there in a later step.
        let name = shop;
        try {
          const data = await adminGraphql<ShopBasics>(shop, access_token, SHOP_BRAND_QUERY);
          name = data.shop.name || shop;
        } catch (e) {
          console.error("shopify-auth basics", e);
        }

        return json({ shop, name, logo: null, colors: null });
      },
    },
  },
});
