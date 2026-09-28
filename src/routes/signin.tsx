import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/signin")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Gravity Pants" },
      { name: "description", content: "Sign in to Gravity Pants to make video ads and GIFs from your photos." },
      { property: "og:title", content: "Sign in — Gravity Pants" },
      { property: "og:description", content: "Sign in to make video ads and GIFs from your photos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = typeof window === "undefined" ? "/app/ads" : safeRedirect(redirect);

  // Already signed in (or returning from Google): go on.
  useEffect(() => {
    const go = () => {
      const saved = sessionStorage.getItem("sf-after-signin");
      sessionStorage.removeItem("sf-after-signin");
      navigate({ to: saved ? safeRedirect(saved) : target, replace: true });
    };
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) go();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your ads.">
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "email", label: "Email", type: "email", autoComplete: "email", value: email, onChange: setEmail },
            { id: "password", label: "Password", type: "password", autoComplete: "current-password", value: password, onChange: setPassword },
          ]}
        />
        <Button type="submit" disabled={busy || !email || !password} className="mt-4 h-11 w-full text-[15px]">
          {busy ? "Signing In…" : "Sign In"}
        </Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-[14px]">
        <Link to="/reset" className="text-primary hover:underline">Forgot password?</Link>
        <Link to="/signup" search={{ redirect }} className="text-primary hover:underline">New here? Create an account</Link>
        <Link to="/pricing" className="text-primary hover:underline">See plans and pricing</Link>
      </div>
    </AuthShell>
  );
}
