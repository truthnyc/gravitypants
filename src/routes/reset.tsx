import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FieldGroup, plainAuthError } from "@/components/auth/AuthShell";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/reset")({
  head: () => siteHead({ path: "/reset", title: "Reset your password — Gravity Pants", description: "Get a link to reset your Gravity Pants password." }),
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
    if (password !== confirm) return setError("The two passwords don't match.");
    if (password.length < 6) return setError("Please use a password with at least 6 characters.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(plainAuthError(error.message));
    else navigate({ to: "/app/ads", replace: true });
  }

  if (recovery) {
    return (
      <AuthShell title="Set a new password" subtitle="You'll use it the next time you sign in.">
        <form onSubmit={setNew} noValidate>
          <FieldGroup
            error={error}
            fields={[{ id: "password", label: "New password", type: "password", autoComplete: "new-password", value: password, onChange: setPassword }, { id: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password", value: confirm, onChange: setConfirm }]}
          />
          <Button type="submit" variant="site" disabled={busy || !password || !confirm} className="auth-submit">
            Save and sign in <ArrowRight size={17} strokeWidth={1.7} />
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? `If ${email} has an account, a link is on its way.` : "We'll email you a link to set a new one."}
    >
      {!sent && (
        <form onSubmit={sendLink} noValidate>
          <FieldGroup
            error={error}
            fields={[{ id: "email", label: "Email", type: "email", autoComplete: "email", value: email, onChange: setEmail }]}
          />
          <Button type="submit" variant="site" disabled={busy || !email} className="auth-submit">
            Send reset link <ArrowRight size={17} strokeWidth={1.7} />
          </Button>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/signin" className="auth-link">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
