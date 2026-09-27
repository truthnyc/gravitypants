import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AppHeader } from "@/components/stillframe/AppHeader";
import { PaymentProblemBanner } from "@/components/billing/BillingNotices";
import { supabase } from "@/integrations/supabase/client";
import { setWorkspaceId } from "@/lib/stillframe/workspace";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/stillframe/account";

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
    // Fire-and-forget: sends the welcome email once for brand-new workspaces.
    void sendWelcomeEmail().catch(() => {});
    const { data: w } = await supabase.from("workspaces").select("suspended_at").eq("id", ws as string).maybeSingle();
    return { user: data.user, workspaceId: ws as string, suspended: !!(w as { suspended_at: string | null } | null)?.suspended_at };
  },
  component: Layout,
});

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { suspended } = Route.useRouteContext();
  if (suspended && !pathname.startsWith("/admin")) return <Paused />;
  return (
    <>
      <PaymentProblemBanner />
      {!pathname.startsWith("/ad/") && <AppHeader />}
      <Outlet />
    </>
  );
}

function Paused() {
  const signOut = useSignOut();
  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <div className="max-w-[400px] rounded-sm bg-card p-10 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Your account is paused</h1>
        <p className="mt-2 text-[14px] text-secondary-text">Please contact support at info@gravitypants.com.</p>
        <Button variant="plain" className="mt-6" onClick={() => void signOut()}>Sign Out</Button>
      </div>
    </main>
  );
}
