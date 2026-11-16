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
  const variantId = new URL(url).searchParams.get("variant");
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: any;
    try { data = JSON.parse(m[1]?.trim() ?? ""); } catch { continue; }
    const p = findProduct(data);
    if (!p) continue;
    const variants = Array.isArray(p.hasVariant) ? p.hasVariant : [];
    const candidates = variants.length ? variants.flatMap((v: any) => (Array.isArray(v.offers) ? v.offers : v.offers ? [v.offers] : []).map((offer: any) => ({ product: v, offer })))
      : (Array.isArray(p.offers) ? p.offers : p.offers ? [p.offers] : []).map((offer: any) => ({ product: p, offer }));
    const selected = variantId ? candidates.find(({ product, offer }: any) => {
      if ([product.productID, product.sku, offer.sku].some((id) => String(id ?? "") === variantId)) return true;
      return [product.url, offer.url, product["@id"], offer["@id"]].some((link) => {
        try { return new URL(String(link), url).searchParams.get("variant") === variantId; } catch { return false; }
      });
    }) : candidates.find(({ offer }: any) => availabilityOf(offer.availability) === "in_stock") ?? candidates[0];
    const offers = selected?.offer;
    const agg = String(offers?.["@type"] ?? "").toLowerCase() === "aggregateoffer";
    const spec = Array.isArray(offers?.priceSpecification) ? offers.priceSpecification[0] : offers?.priceSpecification;
    out.name = typeof p.name === "string" ? decode(p.name) : null;
    out.image_url = absolute(firstImage(p.image), url);
    out.price = num(agg ? (offers?.lowPrice ?? offers?.price) : (offers?.price ?? spec?.price));
    out.currency = (offers?.priceCurrency ?? spec?.priceCurrency ?? null) && String(offers?.priceCurrency ?? spec?.priceCurrency).toUpperCase();
    // A group is sold out only when every variant explicitly is; an unidentifiable
    // requested variant must never inherit another variant's stock status.
    out.availability = variantId ? availabilityOf(offers?.availability)
      : candidates.some(({ offer }: any) => availabilityOf(offer.availability) === "in_stock") ? "in_stock"
      : candidates.length && candidates.every(({ offer }: any) => availabilityOf(offer.availability) === "out_of_stock") ? "out_of_stock" : "unknown";
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

function allImages(img: any, out: string[]) {
  if (!img) return;
  if (typeof img === "string") { out.push(img); return; }
  if (Array.isArray(img)) { for (const i of img) allImages(i, out); return; }
  const u = typeof img.url === "string" ? img.url : typeof img.contentUrl === "string" ? img.contentUrl : null;
  if (u) out.push(u);
}

/** Every distinct product photo on the page (JSON-LD product and variants first, then og:image), https only. */
export function productImages(html: string, url: string, max = 6): string[] {
  const raw: string[] = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: any;
    try { data = JSON.parse(m[1]?.trim() ?? ""); } catch { continue; }
    const p = findProduct(data);
    if (!p) continue;
    allImages(p.image, raw);
    for (const v of Array.isArray(p.hasVariant) ? p.hasVariant : []) allImages(v?.image, raw);
    break;
  }
  for (const t of html.matchAll(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/gi)) {
    const c = t[0].match(/content=["']([^"']*)["']/i)?.[1];
    if (c) raw.push(c);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const a = absolute(r, url);
    if (!a) continue;
    // Shopify-style size suffixes and query strings point at the same photo.
    const key = a.replace(/\?.*$/, "").replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/i, "");
    if (seen.has(key)) continue;
    seen.add(key); out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

export type ProductText = { description: string; details: string; brand: string | null };

const stripTags = (h: string) => decode(h
  .replace(/<\s*(li|p|br|h[1-6]|div|tr|dt|dd)\b[^>]*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))))
  .split("\n").map((l) => l.replace(/[ \t\r\f\v]+/g, " ").trim()).filter(Boolean).join("\n");

/** Readable page text for the product brief: description, body details (lists kept on their own lines) and brand. */
export function productText(html: string, _url: string): ProductText {
  let product: any = null;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { product = findProduct(JSON.parse(m[1]?.trim() ?? "")); } catch { continue; }
    if (product) break;
  }
  const meta = (name: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i"))?.[0].match(/content=["']([^"']*)["']/i)?.[1] ?? "";
  const ld = typeof product?.description === "string" ? product.description : "";
  const description = stripTags(ld || meta("og:description") || meta("description")).replace(/\n/g, " ").slice(0, 1200);
  const b = product?.brand;
  const brand = typeof b === "string" ? b : typeof b?.name === "string" ? b.name : null;
  let body = html.replace(/<(script|style|nav|header|footer|form|svg|noscript|template|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  if (main) body = main;
  else { const bm = body.match(/<body\b[\s\S]*<\/body>/i)?.[0]; if (bm) body = bm; }
  const details = stripTags(body).slice(0, 6000);
  return { description, details, brand: brand ? decode(brand) : null };
}
