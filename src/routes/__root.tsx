import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SearchProvider } from "@/components/stillframe/search-context";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/billing/BillingNotices";
import { trackPageView } from "@/lib/site/track";
import { trackGtmPage } from "@/lib/site/gtm";
import { trackGaPage } from "@/lib/site/ga";
import { currentSite, isIndexedHost } from "@/lib/site/brand-site";
import { ServiceUnavailable } from "@/components/site/ServiceUnavailable";
import { AdvertisingConsent } from "@/components/site/AdvertisingConsent";
import { useBrandSite } from "@/components/site/AimanteShell";
import { CATEGORIES, categorySlug } from "@/lib/directory/directory";
import favicon from "@/assets/site/favicon.svg.asset.json";
import touchIcon from "@/assets/site/apple-touch-icon.png.asset.json";

function NotFoundComponent() {
  if (useBrandSite() === "aimante") return <AimanteNotFound />;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

/** aimante.co 404: back to the collection or straight into a category. */
function AimanteNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-center justify-center px-6 py-20 text-center font-ap text-ap-ink">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Page not found</h1>
      <p className="mt-3 text-[16px] text-ap-body">This page isn't on Aimanté. Start from the collection, or pick a category.</p>
      <Link to="/directory" className="mt-6 inline-flex h-11 items-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Back to Aimanté</Link>
      <nav aria-label="Categories" className="mt-10">
        <h2 className="text-[15px] font-semibold">Browse by category</h2>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <li key={c}><Link to="/directory" search={{ category: categorySlug(c) }} className="inline-flex h-9 items-center rounded-lg bg-ap-panel px-3 text-[14px] hover:bg-ap-media">{c}</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

const RETRY_KEY = "gp:auto-retry";

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [retrying, setRetrying] = useState(true);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    // Record every occurrence so we can see what went wrong and when.
    try {
      void fetch("/api/public/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: location.pathname, message, stack: error instanceof Error ? error.stack : undefined }),
        keepalive: true,
      });
    } catch { /* never block the page */ }
    // Quietly reload once per page per minute; most failures are brief hiccups or a stale tab after publishing.
    try {
      const last = JSON.parse(sessionStorage.getItem(RETRY_KEY) ?? "null") as { path: string; at: number } | null;
      if (!last || last.path !== location.pathname || Date.now() - last.at > 60_000) {
        sessionStorage.setItem(RETRY_KEY, JSON.stringify({ path: location.pathname, at: Date.now() }));
        location.reload();
        return;
      }
    } catch { /* storage unavailable: show the message */ }
    setRetrying(false);
  }, [error]);

  if (retrying) return <div className="min-h-dvh" aria-busy="true" />;
  return <ServiceUnavailable onRetry={() => { router.invalidate(); reset(); }} />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    // Every page sets its own title; these defaults only show on a not-found page.
    const aim = currentSite() === "aimante";
    return {
    meta: [
      { charSet: "utf-8" },
      // Duplicate hosts (gravitypants.lovable.app, previews) stay out of search; canonicals still point at gravitypants.com.
      ...(isIndexedHost() ? [] : [{ name: "robots", content: "noindex, follow" }]),
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: aim ? "Page not found — Aimanté" : "Gravity Pants" },
      {
        name: "description",
        content: aim ? "Aimanté is a collection of independent brands you can browse by mood, category or brand." : "Turn still photos into short video ads and animated GIFs.",
      },
      { property: "og:title", content: aim ? "Page not found — Aimanté" : "Gravity Pants" },
      {
        property: "og:description",
        content: aim ? "Aimanté is a collection of independent brands you can browse by mood, category or brand." : "Turn still photos into short video ads and animated GIFs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&family=Fraunces:wght@500;700;900&family=Montserrat:wght@300;400&family=Playfair+Display:wght@500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: favicon.url },
      { rel: "apple-touch-icon", href: touchIcon.url },
    ],
    };
  },
  beforeLoad: () => ({ site: currentSite() }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The reel player runs inside other people's websites, where the browser blocks
  // stored sign-in data. It needs none of the app chrome, so keep it bare.
  const bare = pathname.startsWith("/embed/");

  useEffect(() => {
    if (bare) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient, bare]);

  useEffect(() => {
    if (bare) return;
    trackPageView(pathname);
    // Google Analytics is sent directly (the GTM container must NOT also hold a
    // GA tag, or page views double-count).
    trackGtmPage(window.location.hostname, pathname);
    void trackGaPage(window.location.hostname, pathname);
  }, [pathname, bare]);

  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        {bare ? (
          <Outlet />
        ) : (
          <>
            <div className="flex h-dvh min-h-dvh flex-col">
              <PaymentTestModeBanner />
              <div className="min-h-0 flex-1 bg-canvas">
                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                <Outlet />
              </div>
            </div>
            <Toaster />
            <AdvertisingConsent pathname={pathname} />
          </>
        )}
      </SearchProvider>
    </QueryClientProvider>
  );
}
