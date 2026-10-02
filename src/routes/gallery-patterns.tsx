import { createFileRoute } from "@tanstack/react-router";
import { goneHandlers } from "@/lib/site/gone";

/** Old WordPress gallery index: real HTTP 410 Gone. */
export const Route = createFileRoute("/gallery-patterns")({
  server: { handlers: goneHandlers },
});
