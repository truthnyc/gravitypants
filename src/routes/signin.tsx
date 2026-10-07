import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { rememberSignupChoice } from "@/lib/stillframe/signup-choice";
import { PLANS } from "@/lib/stillframe/plans-config";
import { siteHead } from "@/lib/site/seo";
import { aimanteHead, currentSite } from "@/lib/site/brand-site";
import { useBrandSite } from "@/components/site/AimanteShell";

export const Route = createFileRoute("/signin")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => currentSite() === "aimante"
    ? aimanteHead({ path: "/sign-in", title: "Sign in — Aimanté", description: "Sign in to your Aimanté account." })
    : siteHead({ path: "/signin", title: "Sign in — Gravity Pants", description: "Sign in to Gravity Pants to make video ads and GIFs from your photos.", noindex: true }),
  component: SignIn,
});

function SignIn() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const site = useBrandSite();
  const aim = site === "aimante";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const target = typeof window === "undefined" ? "/app/ads" : safeRedirect(redirect, aim ? "/directory" : "/app/ads");

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
      navigate({ to: saved ? safeRedirect(saved, target) : target, replace: true });
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
    <AuthShell mode="signin" title={aim ? "Sign in to Aimanté" : "Welcome back."} subtitle={aim ? "Use your Gravity Pants account. It works on both sites." : "Sign in to open your ads and keep working."}>
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "email", label: "Email", type: "email", autoComplete: "email", value: email, placeholder: "you@yourbrand.com", onChange: (value) => { setEmail(value); setEmailError(null); }, error: emailError },
            { id: "password", label: "Password", labelAction: <Button type="button" variant="link" className="auth-link" onClick={() => void forgot()} disabled={busy}>Forgot password?</Button>, type: "password", autoComplete: "current-password", value: password, placeholder: "Your password", onChange: (value) => { setPassword(value); setPasswordError(null); }, error: passwordError },
          ]}
        />
        <div className="auth-options"><label><input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} /> Keep me signed in</label></div>
        {resetSent && <p role="status" className="auth-reset-sent">If that email has an account, a reset link is on its way.</p>}
        <Button type="submit" variant="site" disabled={busy || !email || !password} className="auth-submit">
          {busy ? "Signing in…" : <>Sign in <ArrowRight size={17} strokeWidth={1.7} /></>}
        </Button>
      </form>
      <p className="auth-switch">
        {aim ? "New here?" : "New to Gravity Pants?"} <Link to="/signup" search={{ redirect: aim ? target : redirect }} className="auth-link">{aim ? "Create a free account" : "Start your free trial"}</Link>
      </p>
    </AuthShell>
  );
}
