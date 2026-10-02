import { createFileRoute } from "@tanstack/react-router";
import { goneHandlers } from "@/lib/site/gone";

/** Old WordPress category pages: real HTTP 410 Gone for /product-category/*. */
export const Route = createFileRoute("/product-category/$")({
  server: { handlers: goneHandlers },
});
