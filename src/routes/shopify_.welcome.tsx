import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getShopifyConfig } from "@/lib/shopify/config.functions";
import { remainingText, usePlanWelcome } from "@/components/shopify/ShopPlan";

export const Route = createFileRoute("/shopify_/welcome")({
  validateSearch: (s: Record<string, unknown>) => ({
    plan_handle: typeof s["plan_handle"] === "string" ? (s["plan_handle"] as string) : undefined,
    shop: typeof s["shop"] === "string" ? (s["shop"] as string) : undefined,
    host: typeof s["host"] === "string" ? (s["host"] as string) : undefined,
  }),
  loader: () => getShopifyConfig(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Plan updated · Gravity Pants for Shopify" },
      { name: "description", content: "Your Gravity Pants plan for Shopify." },
      { property: "og:title", content: "Plan updated · Gravity Pants for Shopify" },
      { property: "og:description", content: "Your Gravity Pants plan for Shopify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "shopify-api-key", content: loaderData?.apiKey ?? "" },
    ],
    scripts: [{ src: "https://cdn.shopify.com/shopifycloud/app-bridge.js" }],
  }),
  component: Welcome,
});

function Welcome() {
  const { shop, host } = Route.useSearch();
  const navigate = useNavigate();
  const { info, error } = usePlanWelcome(true);

  useEffect(() => {
    if (info?.returnTo) {
      const t = setTimeout(() => void navigate({ to: "/shopify/reel/$id", params: { id: info.returnTo! }, search: { shop, host, note: `You're on ${info.plan.name}.` } }), 1500);
      return () => clearTimeout(t);
    }
  }, [info, navigate, shop, host]);

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-md rounded border border-border bg-card p-8 text-center">
        {!info && !error && <p className="text-muted-foreground">Checking your plan…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {info && (
          <>
            <h1 className="text-xl font-semibold">You're on {info.plan.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground tabular-nums">{remainingText(info.status)}</p>
            {info.returnTo ? <p className="mt-4 text-sm text-muted-foreground">Taking you back to your reel…</p> : <Link to="/shopify" search={{ shop, host }} data-cta="shopify-welcome-continue" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground">Make a reel</Link>}
          </>
        )}
      </div>
    </main>
  );
}
