import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { rememberSignupChoice } from "@/lib/stillframe/signup-choice";
import { PLANS } from "@/lib/stillframe/plans-config";

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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const target = typeof window === "undefined" ? "/app/ads" : safeRedirect(redirect);

  // Already signed in (or returning from Google): go on.
  useEffect(() => {
    const go = (userId?: string) => {
      try {
        const pending = JSON.parse(sessionStorage.getItem("gravity-pants:pending-plan") ?? "null");
        if (userId && PLANS.some((p) => p.id === pending?.plan) && ["monthly", "yearly"].includes(pending.billing)) rememberSignupChoice(userId, pending);
        sessionStorage.removeItem("gravity-pants:pending-plan");
      } catch { /* Invalid old selection. */ }
      const saved = sessionStorage.getItem("sf-after-signin");
      sessionStorage.removeItem("sf-after-signin");
      navigate({ to: saved ? safeRedirect(saved) : target, replace: true });
    };
    supabase.auth.getSession().then(({ data }) => data.session && go(data.session.user.id));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) go(s.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    if (!keepSignedIn) {
      localStorage.setItem("gravity-pants:session-only", "1");
      sessionStorage.setItem("gravity-pants:session-only", "1");
    } else {
      localStorage.removeItem("gravity-pants:session-only");
      sessionStorage.removeItem("gravity-pants:session-only");
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      const message = plainAuthError(error.message);
      if (message === "Wrong email or password.") setPasswordError(message);
      else setError(message);
      localStorage.removeItem("gravity-pants:session-only");
      sessionStorage.removeItem("gravity-pants:session-only");
    }
  }

  async function forgot() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError("Enter your email above first, then choose Forgot password."); return; }
    setBusy(true); setError(null); setEmailError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/reset" });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else setResetSent(true);
  }

  return (
    <AuthShell mode="signin" title="Welcome back." subtitle="Sign in to keep making reels.">
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "email", label: "Email", type: "email", autoComplete: "email", value: email, placeholder: "you@yourbrand.com", onChange: (value) => { setEmail(value); setEmailError(null); }, error: emailError },
            { id: "password", label: "Password", type: "password", autoComplete: "current-password", value: password, placeholder: "Your password", onChange: (value) => { setPassword(value); setPasswordError(null); }, error: passwordError },
          ]}
        />
        <div className="auth-options"><label><input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} /> Keep me signed in</label><Button type="button" variant="link" className="auth-link" onClick={() => void forgot()} disabled={busy}>Forgot password?</Button></div>
        {resetSent && <p role="status" className="auth-reset-sent">If that email has an account, a reset link is on its way.</p>}
        <Button type="submit" variant="site" disabled={busy || !email || !password} className="auth-submit">
          {busy ? "Signing in…" : <>Sign in <ArrowRight size={17} strokeWidth={1.7} /></>}
        </Button>
      </form>
      <p className="auth-switch">
        New to Gravity Pants? <Link to="/signup" search={{ redirect }} className="auth-link">Start your free trial</Link>
      </p>
    </AuthShell>
  );
}
