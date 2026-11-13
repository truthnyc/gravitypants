import { isPublicHost, parseProductPage, type ProductInfo } from "./product-page";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;

export class ProductFetchError extends Error {}

function checkUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new ProductFetchError("That doesn't look like a web address."); }
  if (u.protocol !== "https:") throw new ProductFetchError("Use a link that starts with https://");
  if (u.username || u.password || (u.port && u.port !== "443")) throw new ProductFetchError("That address isn't allowed.");
  if (!isPublicHost(u.hostname)) throw new ProductFetchError("That address isn't allowed.");
  return u;
}

/** Fetches a public https product page (redirects re-checked, 8 s, 2 MB cap) and returns parsed details only. */
export async function fetchProductInfo(raw: string, timeoutMs = TIMEOUT_MS): Promise<ProductInfo> {
  const { text, url } = await safeFetchText(raw, { timeoutMs, maxBytes: MAX_BYTES, accept: "text/html,application/xhtml+xml" });
  return parseProductPage(text, url);
}

/** Safe public https GET: redirects re-checked against private hosts, time and size capped. Returns text only. */
export async function safeFetchText(raw: string, opts: { timeoutMs: number; maxBytes: number; accept: string; truncate?: boolean }): Promise<{ text: string; url: string }> {
  const { timeoutMs, maxBytes: MAX_BYTES, accept } = opts;
  let u = checkUrl(raw.trim());
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(u.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductPreview/1.0)", Accept: accept } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel();
        if (!loc) break;
        u = checkUrl(new URL(loc, u).toString());
        continue;
      }
      break;
    }
    if (!res || !res.ok || !res.body) throw new ProductFetchError(`The page answered ${res?.status ?? "nothing"}.`);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); total += value.byteLength;
    }
    await reader.cancel().catch(() => {});
    if (total >= MAX_BYTES && opts.truncate === false) throw new ProductFetchError("The file is too large.");
    const buf = new Uint8Array(Math.min(total, MAX_BYTES));
    let off = 0;
    for (const c of chunks) { const take = Math.min(c.byteLength, buf.length - off); buf.set(c.subarray(0, take), off); off += take; if (off >= buf.length) break; }
    return { text: new TextDecoder().decode(buf), url: u.toString() };
  } catch (e) {
    if (e instanceof ProductFetchError) throw e;
    throw new ProductFetchError(ctrl.signal.aborted ? "The address took too long to answer." : "We couldn't reach that address.");
  } finally { clearTimeout(timer); }
}
