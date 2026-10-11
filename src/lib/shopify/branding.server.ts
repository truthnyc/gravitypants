// Server-only: shop logo and colours from the Storefront API into the shop's brand kit. Never blocks a reel.
import { adminGraphql, decryptToken, encryptToken, SHOPIFY_API_VERSION } from "./shopify.server";
import { sanitizeSvg } from "@/lib/stillframe/svg-safety";
// Same bucket and key prefix as getMediaUrl() in media.ts (not imported: that module is browser-side).
export const BRAND_BUCKET = "brand-assets";
export const BRAND_PREFIX = "brand-assets:";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
const MAX_LOGO = 5 * 1024 * 1024;

const CREATE_SF_TOKEN = `mutation CreateSfToken { storefrontAccessTokenCreate(input: { title: "Gravity Pants branding" }) { storefrontAccessToken { accessToken } userErrors { field message } } }`;
const SHOP_BRAND = `query ShopBrand { shop { name brand { logo { image { url } } squareLogo { image { url } } colors { primary { background foreground } secondary { background foreground } } } } }`;

type BrandData = {
  shop: {
    name: string;
    brand: {
      logo: { image: { url: string } | null } | null;
      squareLogo: { image: { url: string } | null } | null;
      colors: { primary: { background: string | null; foreground: string | null }[]; secondary: { background: string | null; foreground: string | null }[] } | null;
    } | null;
  };
};

/** The shop workspace's default brand kit; created empty when missing. */
export async function getShopKit(admin: Admin, ws: string) {
  const { data } = await admin.from("brand_kits").select("id, logo_url, colors").eq("workspace_id", ws).order("is_default", { ascending: false }).limit(1).maybeSingle();
  if (data) return data;
  const { data: made } = await admin.from("brand_kits").insert({ workspace_id: ws, name: "Store brand", is_default: true, colors: [] } as never).select("id, logo_url, colors").single();
  return made as { id: string; logo_url: string | null; colors: string[] } | null;
}

/** Saves a logo file into brand-assets under `<ws>/shopify/`, cleaning SVGs. Returns the `brand-assets:` key. */
export async function storeLogo(admin: Admin, ws: string, bytes: ArrayBuffer, type: string): Promise<string> {
  const ext = LOGO_TYPES[type];
  if (!ext) throw new Error("Use a PNG, JPG or SVG logo.");
  if (!bytes.byteLength || bytes.byteLength > MAX_LOGO) throw new Error("Logos can be up to 5 MB.");
  const body: ArrayBuffer | string = ext === "svg" ? sanitizeSvg(new TextDecoder().decode(bytes)) : bytes;
  const path = `${ws}/shopify/logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from(BRAND_BUCKET).upload(path, body, { contentType: type, upsert: true, cacheControl: "3600" });
  if (error) throw new Error(`Could not save logo: ${error.message}`);
  return `${BRAND_PREFIX}${path}`;
}

export async function setKitLogo(admin: Admin, ws: string, key: string, colors?: string[]) {
  const kit = await getShopKit(admin, ws);
  if (!kit) return;
  await admin.from("brand_kits").update({ logo_url: key, ...(colors?.length ? { colors } : {}) } as never).eq("id", kit.id);
}

/**
 * Creates (once) a Storefront token, reads shop.brand and copies logo + colours into the brand kit.
 * Needs the unauthenticated_read_product_listings scope. Any failure is logged and ignored.
 */
export async function syncShopBranding(admin: Admin, shop: string, ws: string, adminToken: string, tokenKey: string, force = false) {
  try {
    const { data: row } = await admin.from("shopify_shops").select("storefront_token, branding_synced_at").eq("shop_domain", shop).maybeSingle();
    if (!force && row?.branding_synced_at) return;
    let sf = row?.storefront_token ? await decryptToken(row.storefront_token, tokenKey).catch(() => null) : null;
    if (!sf) {
      const r = await adminGraphql<{ storefrontAccessTokenCreate: { storefrontAccessToken: { accessToken: string } | null; userErrors: { message: string }[] } }>(shop, adminToken, CREATE_SF_TOKEN);
      const t = r.storefrontAccessTokenCreate;
      if (!t.storefrontAccessToken) throw new Error(`Storefront token: ${t.userErrors.map((e) => e.message).join("; ") || "not created"}`);
      sf = t.storefrontAccessToken.accessToken;
      await admin.from("shopify_shops").update({ storefront_token: await encryptToken(sf, tokenKey) } as never).eq("shop_domain", shop);
    }
    const res = await fetch(`https://${shop}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": sf },
      body: JSON.stringify({ query: SHOP_BRAND }),
    });
    if (!res.ok) throw new Error(`Storefront API ${res.status}`);
    const json = (await res.json()) as { data?: BrandData; errors?: unknown };
    if (json.errors) throw new Error(`Storefront error: ${JSON.stringify(json.errors).slice(0, 300)}`);
    await admin.from("shopify_shops").update({ branding_synced_at: new Date().toISOString() } as never).eq("shop_domain", shop);
    const brand = json.data?.shop.brand;
    const colors = [...(brand?.colors?.primary ?? []), ...(brand?.colors?.secondary ?? [])]
      .flatMap((c) => [c.background, c.foreground])
      .filter((c): c is string => !!c && /^#[0-9a-f]{3,8}$/i.test(c));
    const url = brand?.logo?.image?.url ?? brand?.squareLogo?.image?.url;
    const kit = await getShopKit(admin, ws);
    if (!url) {
      console.info("shopify branding: store has no brand logo", shop);
      if (kit && colors.length) await admin.from("brand_kits").update({ colors: [...new Set(colors)] } as never).eq("id", kit.id);
      return;
    }
    if (kit?.logo_url) return; // a merchant's own upload wins
    const u = new URL(url);
    if (u.protocol !== "https:" || !(u.hostname === "cdn.shopify.com" || u.hostname.endsWith(".shopify.com") || u.hostname.endsWith(".shopifycdn.com"))) throw new Error("Logo not on Shopify CDN");
    const img = await fetch(u.toString());
    if (!img.ok) throw new Error(`Logo fetch ${img.status}`);
    const type = (img.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const key = await storeLogo(admin, ws, await img.arrayBuffer(), type);
    await setKitLogo(admin, ws, key, [...new Set(colors)]);
  } catch (e) {
    console.error("shopify branding (ignored)", shop, e);
  }
}
