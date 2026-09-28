import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    <AuthShell title="Welcome back." subtitle="Sign in to keep making reels from your photos.">
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "email", label: "Work email", type: "email", autoComplete: "email", value: email, placeholder: "you@yourbrand.com", onChange: setEmail },
            { id: "password", label: "Password", type: "password", autoComplete: "current-password", value: password, placeholder: "Your password", onChange: setPassword },
          ]}
        />
        <button type="submit" disabled={busy || !email || !password} className="auth-submit">
          {busy ? "Signing in…" : <>Sign in <ArrowRight size={17} strokeWidth={1.7} /></>}
        </button>
      </form>
      <p className="auth-switch">
        <Link to="/reset" className="auth-link">Forgot password?</Link>
      </p>
      <p className="auth-switch">
        New here? <Link to="/signup" search={{ redirect }} className="auth-link">Start your free trial</Link>
      </p>
    </AuthShell>
  );
}
