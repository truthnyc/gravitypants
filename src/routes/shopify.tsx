import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getShopifyConfig } from "@/lib/shopify/config.functions";

declare global {
  interface Window {
    shopify?: { idToken: () => Promise<string> };
  }
}

type Result =
  | { state: "loading" }
  | { state: "ok"; name: string; shop: string; logo: string | null }
  | { state: "error"; message: string };

export const Route = createFileRoute("/shopify")({
  validateSearch: (s: Record<string, unknown>) => ({
    shop: typeof s.shop === "string" ? s.shop : undefined,
    host: typeof s.host === "string" ? s.host : undefined,
  }),
  loader: () => getShopifyConfig(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Gravity Pants for Shopify" },
      { name: "description", content: "Turn your Shopify product photos into short video ads." },
      { property: "og:title", content: "Gravity Pants for Shopify" },
      { property: "og:description", content: "Turn your Shopify product photos into short video ads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "shopify-api-key", content: loaderData?.apiKey ?? "" },
    ],
    scripts: [{ src: "https://cdn.shopify.com/shopifycloud/app-bridge.js" }],
  }),
  component: ShopifyHome,
});

async function waitForAppBridge(ms = 8000) {
  const start = Date.now();
  while (!window.shopify?.idToken) {
    if (Date.now() - start > ms) throw new Error("Shopify App Bridge did not load. Open this app from your Shopify admin.");
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.shopify;
}

function ShopifyHome() {
  const { shop, host } = Route.useSearch();
  const { apiKey } = Route.useLoaderData();
  const [result, setResult] = useState<Result>({ state: "loading" });

  useEffect(() => {
    if (!apiKey) return setResult({ state: "error", message: "The Shopify app key hasn't been set up yet." });
    if (!shop || !host) return setResult({ state: "error", message: "Open Gravity Pants from your Shopify admin to connect your store." });
    let cancelled = false;
    (async () => {
      try {
        const bridge = await waitForAppBridge();
        const token = await bridge.idToken();
        const res = await fetch("/api/public/shopify/auth", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not connect your store.");
        if (!cancelled) setResult({ state: "ok", name: body.name, shop: body.shop, logo: body.logo });
      } catch (e) {
        if (!cancelled) setResult({ state: "error", message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, shop, host]);

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-md rounded border border-border bg-card p-8 text-center">
        {result.state === "loading" && <p className="text-muted-foreground">Connecting to your store…</p>}
        {result.state === "ok" && (
          <>
            {result.logo && <img src={result.logo} alt="" className="mx-auto mb-4 h-12 object-contain" />}
            <h1 className="text-xl font-semibold">Connected to {result.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{result.shop}</p>
          </>
        )}
        {result.state === "error" && (
          <>
            <h1 className="text-xl font-semibold">Couldn't connect</h1>
            <p role="alert" className="mt-2 text-sm text-destructive">{result.message}</p>
          </>
        )}
      </div>
    </main>
  );
}
