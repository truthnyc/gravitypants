import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// /admin/templates/:id → the builder at /admin/templates/:id/edit.
export const Route = createFileRoute("/_authenticated/admin/templates/$id")({
  beforeLoad: ({ params, location }) => {
    if (location.pathname.replace(/\/$/, "") === `/admin/templates/${params.id}`) {
      throw redirect({ to: "/admin/templates/$id/edit", params: { id: params.id } });
    }
  },
  component: Outlet,
});
