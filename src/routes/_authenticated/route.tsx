import { createFileRoute, notFound, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { AppHeader } from "@/components/stillframe/AppHeader";
import { PaymentProblemBanner } from "@/components/billing/BillingNotices";
import { supabase } from "@/integrations/supabase/client";
import { preferredWorkspaceId, rememberWorkspaceId, setWorkspaceId } from "@/lib/stillframe/workspace";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/stillframe/account";
import { sendWelcomeEmail } from "@/lib/stillframe/welcome.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (localStorage.getItem("gravity-pants:session-only") && !sessionStorage.getItem("gravity-pants:session-only")) {
      await supabase.auth.signOut();
      localStorage.removeItem("gravity-pants:session-only");
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Staff area stays hidden: signed-out visitors see "not found", not a sign-in prompt.
      if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) throw notFound();
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    }
    // Join any teams this email was invited to, even if the invite link was lost during sign-up.
    const { data: joined } = await supabase.rpc("accept_my_invites" as never);
    if (joined) rememberWorkspaceId(data.user.id, joined as unknown as string);
    const { data: ws, error: wsError } = await supabase.rpc("ensure_workspace");
    if (wsError || !ws) throw wsError ?? new Error("No workspace");
    const preferred = preferredWorkspaceId(data.user.id);
    let activeWorkspace = ws as string;
    if (preferred && preferred !== activeWorkspace) {
      const { data: membership } = await supabase.from("workspace_members")
        .select("workspace_id").eq("workspace_id", preferred).eq("user_id", data.user.id).maybeSingle();
      if (membership) activeWorkspace = preferred;
    }
    setWorkspaceId(activeWorkspace);
    // Fire-and-forget: sends the welcome email once for brand-new workspaces.
    void sendWelcomeEmail().catch(() => {});
    const { data: w } = await supabase.from("workspaces").select("suspended_at").eq("id", activeWorkspace).maybeSingle();
    return { user: data.user, workspaceId: activeWorkspace, suspended: !!(w as { suspended_at: string | null } | null)?.suspended_at };
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
      {!pathname.startsWith("/app/ad/") && !pathname.startsWith("/admin") && <AppHeader />}
      <Outlet />
      <UpgradeDialog />
    </>
  );
}

function Paused() {
  const signOut = useSignOut();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 sm:px-8">
      <div className="max-w-[400px] rounded-sm bg-card p-10 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Your account is paused</h1>
        <p className="mt-2 text-[14px] text-secondary-text">Please contact support at info@gravitypants.com.</p>
        <Button variant="plain" className="mt-6" onClick={() => void signOut()}>Sign Out</Button>
      </div>
    </main>
  );
}
