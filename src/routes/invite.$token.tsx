import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rememberWorkspaceId } from "@/lib/stillframe/workspace";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Join your team — Gravity Pants" },
      { name: "description", content: "Accept your invite to join a team workspace on Gravity Pants." },
      { property: "og:title", content: "Join your team — Gravity Pants" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showSignOut, setShowSignOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        void navigate({ to: "/signup", search: { redirect: `/invite/${token}` } });
        return;
      }
      const { data, error: rpcError } = await supabase.rpc("accept_invite" as never, { _token: token } as never);
      if (cancelled) return;
      if (rpcError || !data) {
        const msg = rpcError?.message ?? "";
        if (msg.includes("different email")) {
          setError(
            `This invite was sent to a different email address. You're signed in as ${session.session.user.email ?? "another account"} — sign out and open the link again with the invited email.`,
          );
          setShowSignOut(true);
        } else if (msg.includes("full") || msg.includes("No seats")) {
          setError("This team is full — ask the owner to free up a seat.");
        } else if (msg.includes("expired")) {
          setError("This invite has expired — ask the owner to resend it from the Team page.");
        } else {
          setError("This invite isn't valid. It may have been cancelled or already used.");
        }
        return;
      }
      rememberWorkspaceId(session.session.user.id, data as unknown as string);
      window.location.href = "/app/ads";
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <GravityPantsLogo size={44} showWordmark />
      {error ? (
        <>
          <p className="max-w-[420px] text-[15px] text-secondary-text">{error}</p>
          {showSignOut ? (
            <button
              type="button"
              className="text-[15px] font-medium text-primary"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = `/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`;
              }}
            >
              Sign out and continue
            </button>
          ) : (
            <a href="/app/ads" className="text-[15px] font-medium text-primary">Go to your ads</a>
          )}
        </>
      ) : (
        <p className="text-[15px] text-secondary-text">Joining your team…</p>
      )}
    </main>
  );
}
