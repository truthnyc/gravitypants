import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getShopifyConfig } from "@/lib/shopify/config.functions";
import { shopifyFetch, waitForAppBridge } from "@/lib/shopify/bridge";
import { PlanBar, useShopPlan } from "@/components/shopify/ShopPlan";

type Result =
  | { state: "loading" }
  | { state: "ok"; name: string; shop: string; logo: string | null }
  | { state: "error"; message: string };

const MAX = 10;

export const Route = createFileRoute("/shopify")({
  validateSearch: (s: Record<string, unknown>) => ({
    shop: typeof s["shop"] === "string" ? (s["shop"] as string) : undefined,
    host: typeof s["host"] === "string" ? (s["host"] as string) : undefined,
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

function ShopifyHome() {
  const { shop, host } = Route.useSearch();
  const { apiKey } = Route.useLoaderData();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result>({ state: "loading" });
  const [making, setMaking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return setResult({ state: "error", message: "The Shopify app key hasn't been set up yet." });
    if (!shop || !host) return setResult({ state: "error", message: "Open Gravity Pants from your Shopify admin to connect your store." });
    let cancelled = false;
    (async () => {
      try {
        const body = await shopifyFetch<{ name: string; shop: string; logo: string | null }>("/api/public/shopify/auth");
        if (!cancelled) setResult({ state: "ok", name: body.name, shop: body.shop, logo: body.logo });
      } catch (e) {
        if (!cancelled) setResult({ state: "error", message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, shop, host]);

  async function makeReel() {
    setError(null);
    setNote(null);
    try {
      const bridge = await waitForAppBridge();
      if (!bridge.resourcePicker) throw new Error("The Shopify product picker isn't available here.");
      const picked = await bridge.resourcePicker({ type: "product", multiple: MAX, action: "select" });
      if (!picked?.length) return;
      setMaking(true);
      const ids = picked.map((p) => p.id);
      const res = await shopifyFetch<{ projectId: string; skipped: string[]; trimmed: boolean }>("/api/public/shopify/products", { ids });
      const notes = [res.trimmed || ids.length > MAX ? `Only the first ${MAX} products were used.` : "", res.skipped.length ? `Skipped (no photos): ${res.skipped.join(", ")}.` : ""].filter(Boolean).join(" ");
      void navigate({ to: "/shopify/reel/$id", params: { id: res.projectId }, search: { shop, host, note: notes || undefined } });
    } catch (e) {
      setError((e as Error).message);
      setMaking(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-md rounded border border-border bg-card p-8 text-center">
        {result.state === "loading" && <p className="text-muted-foreground">Connecting to your store…</p>}
        {result.state === "ok" && (
          <>
            {result.logo && <img src={result.logo} alt="" className="mx-auto mb-4 h-12 object-contain" />}
            <h1 className="text-xl font-semibold">Connected to {result.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pick up to {MAX} products. We'll use their photos, names and prices.</p>
            <button
              type="button"
              data-cta="shopify-make-reel"
              onClick={makeReel}
              disabled={making}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {making ? "Making your reel…" : "Make a reel"}
            </button>
            <div className="mt-6 flex justify-center"><ShopPlanSummary /></div>
            {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
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

function ShopPlanSummary() {
  const { info } = useShopPlan();
  return <PlanBar info={info} />;
}
