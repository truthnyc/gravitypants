import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";

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
  const { redirect } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const target = typeof window === "undefined" ? "/app/ads" : safeRedirect(redirect);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Please use a password with at least 6 characters.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + "/app/ads" },
    });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a link to ${email}. Open it to finish.`}>
        <p className="text-[15px]">
          <Link to="/signin" className="auth-link">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="7-day free trial"
      title={"Your first reel is\nthree photos away."}
      subtitle="Create your account and make a video ad in minutes. No editing skills needed."
    >
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "name", label: "Your name", type: "text", autoComplete: "name", value: name, placeholder: "Alex Rivera", onChange: setName },
            { id: "email", label: "Work email", type: "email", autoComplete: "email", value: email, placeholder: "you@yourbrand.com", onChange: setEmail },
            { id: "password", label: "Password", type: "password", autoComplete: "new-password", value: password, placeholder: "At least 8 characters", onChange: setPassword },
          ]}
        />
        <button type="submit" disabled={busy || !email || !password} className="auth-submit">
          {busy ? "Creating…" : <>Start free trial <ArrowRight size={17} strokeWidth={1.7} /></>}
        </button>
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
