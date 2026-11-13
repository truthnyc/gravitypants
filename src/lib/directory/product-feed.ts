/** Google Shopping (Merchant Center) feed reader: RSS/Atom XML with g: fields, or tab/comma-separated text. Pure. */
export type FeedItem = { external_id: string; name: string; price: number | null; currency: string; url: string; image_url: string | null; availability: "in_stock" | "out_of_stock" | "unknown" };

export const FEED_MAX_ITEMS = 20000;

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => e[0] === "#" ? String.fromCodePoint(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? _)
    .trim();
}

/** "24.00 USD" / "USD 24,00" / "24" → price + currency. */
export function splitPrice(v: string | undefined | null, fallback = "USD"): { price: number | null; currency: string } {
  if (!v) return { price: null, currency: fallback };
  const cur = v.match(/\b([A-Za-z]{3})\b/)?.[1]?.toUpperCase() ?? fallback;
  let n = v.replace(/[^0-9.,]/g, "");
  if (/,\d{1,2}$/.test(n) && !/\.\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/,/g, "");
  const price = n ? Number(n) : NaN;
  return { price: Number.isFinite(price) && price >= 0 ? price : null, currency: cur };
}

export function feedAvailability(v: string | undefined | null): FeedItem["availability"] {
  const s = (v ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!s) return "unknown";
  if (s.includes("out_of_stock") || s.includes("outofstock") || s.includes("discontinued")) return "out_of_stock";
  if (s.includes("in_stock") || s.includes("instock") || s.includes("preorder") || s.includes("backorder")) return "in_stock";
  return "unknown";
}

function toItem(get: (k: string) => string | undefined): FeedItem | null {
  const id = get("id"), title = get("title"), link = get("link");
  if (!id || !title || !link || !/^https?:\/\//i.test(link)) return null;
  const base = splitPrice(get("price"));
  const sale = splitPrice(get("sale_price"), base.currency);
  const img = get("image_link");
  return {
    external_id: id.slice(0, 200), name: title.slice(0, 120),
    price: sale.price ?? base.price, currency: sale.price != null ? sale.currency : base.currency,
    url: link.replace(/^http:/i, "https:"), image_url: img && /^https?:\/\//i.test(img) ? img.replace(/^http:/i, "https:") : null,
    availability: feedAvailability(get("availability")),
  };
}

function parseXml(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  for (const m of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const block = m[2]!;
    const get = (k: string) => {
      const g = block.match(new RegExp(`<g:${k}\\b[^>]*>([\\s\\S]*?)</g:${k}>`, "i"))?.[1];
      if (g != null) return decode(g) || undefined;
      if (k === "link") {
        const href = block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
        if (href) return decode(href);
      }
      const plain = block.match(new RegExp(`<${k}\\b[^>]*>([\\s\\S]*?)</${k}>`, "i"))?.[1];
      return plain != null ? decode(plain) || undefined : undefined;
    };
    const it = toItem(get);
    if (it) out.push(it);
    if (out.length >= FEED_MAX_ITEMS) break;
  }
  return out;
}

function splitRow(line: string, d: string): string[] {
  if (d === "\t") return line.split("\t").map((c) => c.trim());
  const cells: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === d) { cells.push(cur.trim()); cur = ""; } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function parseText(text: string): FeedItem[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const d = lines[0]!.includes("\t") ? "\t" : ",";
  const head = splitRow(lines[0]!, d).map((h) => h.toLowerCase().replace(/^g:/, "").replace(/\s+/g, "_"));
  const out: FeedItem[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitRow(line, d);
    const it = toItem((k) => { const i = head.indexOf(k); return i >= 0 ? cells[i] || undefined : undefined; });
    if (it) out.push(it);
    if (out.length >= FEED_MAX_ITEMS) break;
  }
  return out;
}

export function parseFeed(body: string): FeedItem[] {
  const t = body.trimStart();
  const items = t.startsWith("<") ? parseXml(t) : parseText(t);
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.external_id) ? false : (seen.add(i.external_id), true)));
}
