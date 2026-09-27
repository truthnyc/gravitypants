import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AppHeader } from "@/components/stillframe/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { setWorkspaceId } from "@/lib/stillframe/workspace";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    }
    const { data: ws, error: wsError } = await supabase.rpc("ensure_workspace");
    if (wsError || !ws) throw wsError ?? new Error("No workspace");
    setWorkspaceId(ws as string);
    return { user: data.user, workspaceId: ws as string };
  },
  component: Layout,
});

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {!pathname.startsWith("/ad/") && <AppHeader />}
      <Outlet />
    </>
  );
}
