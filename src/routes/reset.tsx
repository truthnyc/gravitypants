import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FieldGroup, plainAuthError } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/reset")({
  head: () => ({
    meta: [
      { title: "Reset your password — Stillframe" },
      { name: "description", content: "Get a link to reset your Stillframe password." },
      { property: "og:title", content: "Reset your password — Stillframe" },
      { property: "og:description", content: "Get a link to reset your password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset",
    });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else setSent(true);
  }

  async function setNew(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Please use a password with at least 6 characters.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else navigate({ to: "/", replace: true });
  }

  if (recovery) {
    return (
      <AuthShell title="Choose a new password" subtitle="You'll use it the next time you sign in.">
        <form onSubmit={setNew} noValidate>
          <FieldGroup
            error={error}
            fields={[{ id: "password", label: "New password", type: "password", autoComplete: "new-password", value: password, onChange: setPassword }]}
          />
          <Button type="submit" disabled={busy || !password} className="mt-4 h-11 w-full text-[15px]">
            Save Password
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? `If ${email} has an account, a link is on its way.` : "We'll email you a link to choose a new one."}
    >
      {!sent && (
        <form onSubmit={sendLink} noValidate>
          <FieldGroup
            error={error}
            fields={[{ id: "email", label: "Email", type: "email", autoComplete: "email", value: email, onChange: setEmail }]}
          />
          <Button type="submit" disabled={busy || !email} className="mt-4 h-11 w-full text-[15px]">
            Send Reset Link
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-[14px]">
        <Link to="/signin" className="text-primary hover:underline">Already have an account? Sign in</Link>
      </p>
    </AuthShell>
  );
}
