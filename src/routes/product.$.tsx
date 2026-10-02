import { createFileRoute } from "@tanstack/react-router";
import { goneHandlers } from "@/lib/site/gone";

/** Permanently removed section: real HTTP 410 Gone for /product/*, never a redirect or 404. */
export const Route = createFileRoute("/product/$")({
  server: { handlers: goneHandlers },
});
