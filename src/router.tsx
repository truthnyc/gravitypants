import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { aimanteRewrite } from "./lib/site/brand-site";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // aimante.co shows the Directory under its own short addresses (/, /c/…, /mood/…, /b/…).
    rewrite: aimanteRewrite,
  });

  // Always land at the top of a new page (footer links included).
  router.subscribe("onResolved", ({ fromLocation, toLocation }) => {
    if (typeof window === "undefined" || toLocation.hash) return;
    if (fromLocation && fromLocation.pathname === toLocation.pathname) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });

  return router;
};
