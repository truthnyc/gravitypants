// Browser-side App Bridge helpers. The session token is the only identity inside the Shopify admin iframe:
// no cookies, no localStorage.
type PickerItem = { id: string; title?: string };

export const OUTSIDE_ADMIN_MESSAGE = "Gravity Pants for Shopify runs inside your Shopify admin. Open it from Apps in your store.";
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
    if (Date.now() - start > ms) throw new Error(OUTSIDE_ADMIN_MESSAGE);
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.shopify;
}

/** POSTs JSON to a /api/public/shopify/* route with a fresh session token. */
export async function shopifyFetch<T>(path: string, body?: unknown): Promise<T> {
  const bridge = await waitForAppBridge();
  const token = await bridge.idToken();
  const init: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  };
  const res = await fetch(path, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Something went wrong.");
  return json as T;
}
