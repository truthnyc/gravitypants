import { createFileRoute } from "@tanstack/react-router";
import { goneHandlers } from "@/lib/site/gone";

/** Old WordPress category index: real HTTP 410 Gone. */
export const Route = createFileRoute("/product-category")({
  server: { handlers: goneHandlers },
});
