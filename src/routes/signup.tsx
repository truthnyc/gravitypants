import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { planById } from "@/lib/stillframe/plans-config";
import { rememberSignupChoice } from "@/lib/stillframe/signup-choice";
import { templateForExample } from "@/lib/site/example-template";

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({
    redirect: z.string().optional(),
    template: z.string().optional(),
    plan: z.enum(["simple", "business", "team"]).optional(),
    billing: z.enum(["monthly", "yearly"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Create your account — Gravity Pants" },
      { name: "description", content: "Create a Gravity Pants account and turn photos into video ads and GIFs." },
      { property: "og:title", content: "Create your account — Gravity Pants" },
      { property: "og:description", content: "Turn photos into video ads and GIFs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const { redirect, plan, billing, template } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const target = typeof window === "undefined" ? "/app/ads" : safeRedirect(redirect);
  const choice = plan ? { plan, billing: plan === "simple" ? "monthly" as const : billing ?? "monthly" as const } : null;

  useEffect(() => {
    if (template && templateForExample(template)) sessionStorage.setItem("gravity-pants:example", template);
    if (choice) sessionStorage.setItem("gravity-pants:pending-plan", JSON.stringify(choice));
    const go = (userId: string) => {
      if (choice) rememberSignupChoice(userId, choice);
      if (target.startsWith("/invite/")) window.location.href = target;
      else void navigate({ to: "/app/ads", replace: true });
    };
    void supabase.auth.getSession().then(({ data }) => { if (data.session) go(data.session.user.id); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) go(session.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [template, plan, billing, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setEmailError("Enter a valid email address.");
    if (password.length < 8) return setPasswordError("Please use a password with at least 8 characters.");
    setBusy(true);
    setError(null);
    const confirmation = new URL(target.startsWith("/invite/") ? target : "/app/ads", window.location.origin);
    confirmation.searchParams.set("welcome", "1");
    if (template && templateForExample(template)) confirmation.searchParams.set("template", template);
    if (choice) { confirmation.searchParams.set("plan", choice.plan); confirmation.searchParams.set("billing", choice.billing); }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: confirmation.toString() },
    });
    setBusy(false);
    if (error) {
      const message = plainAuthError(error.message);
      if (message.includes("already in use")) setEmailError(message);
      else if (message.includes("password")) setPasswordError(message);
      else setError(message);
    } else if (data.user && data.user.identities?.length === 0) {
      setEmailError("That email is already in use. Sign in instead?");
    } else {
      if (choice && data.user) rememberSignupChoice(data.user.id, choice);
      sessionStorage.setItem("gravity-pants:welcome", "1");
      if (data.session) { if (target.startsWith("/invite/")) window.location.href = target; else navigate({ to: "/app/ads", replace: true }); }
      else setSent(true);
    }
  }

  const joining = target.startsWith("/invite/");

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={joining ? `We sent a link to ${email}. Open it to finish your account and join your team.` : `We sent a link to ${email}. Open it to finish your account and start your free trial.`}>
        <p className="text-[15px]">
          <Link to="/signin" className="auth-link">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={joining ? "Team invite" : "7-day free trial"}
      title={joining ? "Join your team\non Gravity Pants." : "Your first reel is\nthree photos away."}
      subtitle={joining ? "Use the email address that received the invite. After you sign up, you can open the team's ads, brand kits and templates." : "Create an account, add a few photos and make your first video ad. You do not need video editing experience."}
      beforeForm={!joining && choice && <div className="auth-plan-chip">Selected: {planById(choice.plan).name} · ${choice.billing === "yearly" ? planById(choice.plan).yearly?.toLocaleString() : planById(choice.plan).monthly}/{choice.billing === "yearly" ? "year" : "month"} · <Link to="/pricing">Change</Link></div>}
    >
      <GoogleButton redirectTo={target} onStart={() => sessionStorage.setItem("gravity-pants:welcome", "1")} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "name", label: "Your name", type: "text", autoComplete: "name", value: name, placeholder: "Alex Rivera", onChange: setName },
            { id: "email", label: "Work email", type: "email", autoComplete: "email", value: email, placeholder: "you@yourbrand.com", onChange: setEmail, error: emailError },
            { id: "password", label: "Password", type: "password", autoComplete: "new-password", value: password, placeholder: "At least 8 characters", onChange: setPassword, error: passwordError },
          ]}
        />
        <Button type="submit" variant="site" disabled={busy || !name || !email || !password} className="auth-submit">
          {busy ? "Creating…" : <>{joining ? "Join the team" : "Start free trial"} <ArrowRight size={17} strokeWidth={1.7} /></>}
        </Button>
      </form>
      <p className="auth-legal">
        By creating an account you agree to the <Link to="/terms" className="auth-link">Terms</Link> and <Link to="/privacy" className="auth-link">Privacy Policy</Link>.
      </p>
      <p className="auth-switch">
        Already have an account? <Link to="/signin" search={{ redirect }} className="auth-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
