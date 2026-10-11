// Browser-side App Bridge helpers. The session token is the only identity inside the Shopify admin iframe:
// no cookies, no localStorage.
type PickerItem = { id: string; title?: string };
declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
      resourcePicker?: (o: { type: "product"; multiple?: boolean | number; action?: "select" }) => Promise<PickerItem[] | undefined>;
    };
  }
}

export async function waitForAppBridge(ms = 8000) {
  const start = Date.now();
  while (!window.shopify?.idToken) {
    if (Date.now() - start > ms) throw new Error("Shopify App Bridge did not load. Open this app from your Shopify admin.");
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.shopify;
}

/** POSTs JSON to a /api/public/shopify/* route with a fresh session token. */
export async function shopifyFetch<T>(path: string, body?: unknown): Promise<T> {
  const bridge = await waitForAppBridge();
  const token = await bridge.idToken();
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Something went wrong.");
  return json as T;
}
