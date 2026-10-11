import { createFileRoute } from "@tanstack/react-router";
import {
  adminGraphql,
  encryptToken,
  exchangeOfflineToken,
  SHOP_BRAND_QUERY,
  verifySessionToken,
} from "@/lib/shopify/shopify.server";

type BrandColor = { background: string | null; foreground: string | null };
type ShopBrand = {
  shop: {
    name: string;
    brand: {
      logo: { image: { url: string } | null } | null;
      squareLogo: { image: { url: string } | null } | null;
      colors: { primary: BrandColor[]; secondary: BrandColor[] };
    } | null;
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

        try {
          const { access_token, scope } = await exchangeOfflineToken(shop, sessionToken, apiKey, secret);
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

          const data = await adminGraphql<ShopBrand>(shop, access_token, SHOP_BRAND_QUERY);
          const b = data.shop.brand;
          return json({
            shop,
            name: data.shop.name,
            logo: b?.logo?.image?.url ?? b?.squareLogo?.image?.url ?? null,
            colors: b?.colors ?? null,
          });
        } catch (e) {
          console.error("shopify-auth", e);
          return json({ error: (e as Error).message }, 502);
        }
      },
    },
  },
});
