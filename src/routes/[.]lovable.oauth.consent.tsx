import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  head: () => ({ meta: [{ title: "Connect an assistant — Gravity Pants" }, { name: "description", content: "Approve protected assistant access to your Gravity Pants workspace and ads." }, { property: "og:title", content: "Connect an assistant — Gravity Pants" }, { property: "og:description", content: "Approve access to your Gravity Pants account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its request. Start again from your assistant.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw redirect({ to: "/signin", search: { redirect: location.pathname + location.searchStr + location.hash } });
    return { email: data.session.user.email };
  },
  loader: async ({ location, context }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Missing connection request.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error) throw error;
    if (data?.redirect_url && !data.client) throw redirect({ href: data.redirect_url });
    return { details: data, email: context.email };
  },
  errorComponent: ({ error }) => <AuthShell title="Connection unavailable" subtitle="This request may have expired. Start again from your assistant."><p role="alert" className="text-sm text-destructive">{error.message}</p></AuthShell>,
  component: Consent,
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "your assistant";
  async function decide(approve: boolean) {
    setBusy(true); setError(null);
    try {
      const result = approve ? await supabase.auth.oauth.approveAuthorization(authorization_id) : await supabase.auth.oauth.denyAuthorization(authorization_id);
      if (result.error) throw result.error;
      if (!result.data?.redirect_url) throw new Error("No return address was received. Start again from your assistant.");
      window.location.href = result.data.redirect_url;
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed. Please try again."); setBusy(false); }
  }
  return <AuthShell title={`Connect ${name} to Gravity Pants`} subtitle={`This lets ${name} read your workspace and ad inventory as you.`}>
    <p className="break-all text-sm text-secondary-text">Signed in as {email}</p>
    <p className="mt-3 break-all text-sm">Return address: {details?.redirect_uri}</p>
    <p className="mt-3 text-sm text-secondary-text">Your existing account permissions still apply. No editing, exporting, publishing or sending is included.</p>
    {details?.scope && <p className="mt-3 break-words text-sm">Identity permissions: {details.scope}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void decide(true)}>Approve connection</Button><Button variant="secondary" disabled={busy} onClick={() => void decide(false)}>Cancel connection</Button></div>
    <Button variant="ghost" disabled={busy} className="mt-3" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}>Use another account</Button>
  </AuthShell>;
}