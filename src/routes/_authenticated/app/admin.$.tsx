import { createFileRoute, redirect } from "@tanstack/react-router";

// Old links to /app/admin/* keep working.
export const Route = createFileRoute("/_authenticated/app/admin/$")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/admin${params._splat ? `/${params._splat}` : ""}` });
  },
});
