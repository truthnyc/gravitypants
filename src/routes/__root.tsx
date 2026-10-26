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
import { currentSite } from "@/lib/site/brand-site";
import { ServiceUnavailable } from "@/components/site/ServiceUnavailable";
import favicon from "@/assets/site/favicon.svg.asset.json";
import touchIcon from "@/assets/site/apple-touch-icon.png.asset.json";

function NotFoundComponent() {
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Gravity Pants" },
      {
        name: "description",
        content: "Turn still photos into short video ads and animated GIFs.",
      },
      { property: "og:title", content: "Gravity Pants" },
      {
        property: "og:description",
        content: "Turn still photos into short video ads and animated GIFs.",
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
  }),
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

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { trackPageView(pathname); }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        <div className="flex h-dvh min-h-dvh flex-col">
          <PaymentTestModeBanner />
          <div className="min-h-0 flex-1 bg-canvas">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </div>
        </div>
        <Toaster />
      </SearchProvider>
    </QueryClientProvider>
  );
}
