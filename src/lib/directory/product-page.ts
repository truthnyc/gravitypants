/** Reads product details from a product page's HTML (schema.org JSON-LD first, then Open Graph). Pure: no network. */
export type ProductInfo = { name: string | null; price: number | null; currency: string | null; image_url: string | null; availability: "in_stock" | "out_of_stock" | "unknown"; url: string };

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

function isProduct(n: any): boolean {
  const t = n?.["@type"];
  return Array.isArray(t) ? t.some((x) => String(x).toLowerCase() === "product" || String(x).toLowerCase() === "productgroup") : ["product", "productgroup"].includes(String(t ?? "").toLowerCase());
}

function findProduct(node: any, depth = 0): any {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findProduct(n, depth + 1); if (f) return f; } return null; }
  if (isProduct(node)) return node;
  if (node["@graph"]) return findProduct(node["@graph"], depth + 1);
  if (node.mainEntity) return findProduct(node.mainEntity, depth + 1);
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function firstImage(img: any): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return firstImage(img[0]);
  return typeof img.url === "string" ? img.url : typeof img.contentUrl === "string" ? img.contentUrl : null;
}

function availabilityOf(v: unknown): ProductInfo["availability"] {
  const s = String(v ?? "").toLowerCase();
  if (!s) return "unknown";
  if (/outofstock|soldout|discontinued/.test(s)) return "out_of_stock";
  if (/instock|limitedavailability|preorder|onlineonly|instoreonly|backorder/.test(s)) return "in_stock";
  return "unknown";
}

function absolute(u: string | null, base: string): string | null {
  if (!u) return null;
  try { const x = new URL(decode(u), base); return x.protocol === "https:" ? x.toString() : x.protocol === "http:" ? x.toString().replace(/^http:/, "https:") : null; } catch { return null; }
}

function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key.replace(/[:.]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c) : null;
}

export function parseProductPage(html: string, url: string): ProductInfo {
  const out: ProductInfo = { name: null, price: null, currency: null, image_url: null, availability: "unknown", url };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: any;
    try { data = JSON.parse(m[1]!.trim()); } catch { continue; }
    const p = findProduct(data);
    if (!p) continue;
    let offers = p.offers ?? (Array.isArray(p.hasVariant) ? p.hasVariant[0]?.offers : null);
    if (Array.isArray(offers)) offers = offers[0];
    const agg = String(offers?.["@type"] ?? "").toLowerCase() === "aggregateoffer";
    const spec = Array.isArray(offers?.priceSpecification) ? offers.priceSpecification[0] : offers?.priceSpecification;
    out.name = typeof p.name === "string" ? decode(p.name) : null;
    out.image_url = absolute(firstImage(p.image), url);
    out.price = num(agg ? (offers?.lowPrice ?? offers?.price) : (offers?.price ?? spec?.price));
    out.currency = (offers?.priceCurrency ?? spec?.priceCurrency ?? null) && String(offers?.priceCurrency ?? spec?.priceCurrency).toUpperCase();
    out.availability = availabilityOf(offers?.availability);
    break;
  }
  if (!out.name) out.name = meta(html, "og:title");
  if (!out.image_url) out.image_url = absolute(meta(html, "og:image"), url);
  if (out.price == null) out.price = num(meta(html, "product:price:amount") ?? meta(html, "og:price:amount"));
  if (!out.currency) out.currency = (meta(html, "product:price:currency") ?? meta(html, "og:price:currency"))?.toUpperCase() ?? null;
  if (out.currency && !/^[A-Z]{3}$/.test(out.currency)) out.currency = null;
  return out;
}

/** True when the page gave something usable. */
export const hasProductData = (p: ProductInfo) => !!p.name && (p.price != null || !!p.image_url);

/** Refuses localhost, private, link-local and other internal hosts (literal IPs and well-known names). */
export function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan") || h.endsWith(".home.arpa") || !h.includes(".") && !h.includes(":")) return false;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return false;
  if (h.includes(":")) {
    if (h === "::" || h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("::ffff:")) return false;
  }
  return true;
}
