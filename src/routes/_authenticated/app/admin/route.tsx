import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { checkAdmin } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  beforeLoad: async () => {
    const { admin } = await checkAdmin();
    if (!admin) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Admin — Gravity Pants" },
      { name: "description", content: "Private admin area." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Gravity Pants" },
      { property: "og:description", content: "Private admin area." },
    ],
  }),
  notFoundComponent: () => (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-[22px] font-bold">Page not found</h1>
      </div>
    </main>
  ),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
