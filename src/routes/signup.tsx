import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FieldGroup, GoogleButton, plainAuthError, safeRedirect } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Create your account — Stillframe" },
      { name: "description", content: "Create a Stillframe account and turn photos into video ads and GIFs." },
      { property: "og:title", content: "Create your account — Stillframe" },
      { property: "og:description", content: "Turn photos into video ads and GIFs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const target = typeof window === "undefined" ? "/" : safeRedirect(redirect);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Please use a password with at least 6 characters.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a link to ${email}. Open it to finish.`}>
        <p className="text-center text-[14px]">
          <Link to="/signin" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Just an email and a password.">
      <GoogleButton redirectTo={target} />
      <form onSubmit={submit} noValidate>
        <FieldGroup
          error={error}
          fields={[
            { id: "email", label: "Email", type: "email", autoComplete: "email", value: email, onChange: setEmail },
            { id: "password", label: "Password", type: "password", autoComplete: "new-password", value: password, onChange: setPassword },
          ]}
        />
        <Button type="submit" disabled={busy || !email || !password} className="mt-4 h-11 w-full text-[15px]">
          {busy ? "Creating…" : "Create Account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-[14px]">
        <Link to="/signin" search={{ redirect }} className="text-primary hover:underline">Already have an account? Sign in</Link>
      </p>
    </AuthShell>
  );
}
