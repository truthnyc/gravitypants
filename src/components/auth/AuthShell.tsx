import { useState, type ReactNode } from "react";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { lovable } from "@/integrations/lovable";
import { cn } from "@/lib/utils";

export function safeRedirect(r: unknown): string {
  if (typeof r !== "string") return "/";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return "/";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/";
  }
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-canvas px-4 pb-16 pt-[12dvh]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <GravityPantsLogo size={56} />
          <p className="mt-3 text-[16px] font-semibold tracking-[-0.01em]">Gravity Pants</p>
          <h1 className="mt-6 text-[32px] font-bold tracking-[-0.02em]">{title}</h1>
          <p className="mt-1 text-[15px] text-secondary-text">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function GoogleButton({ redirectTo }: { redirectTo: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          sessionStorage.setItem("sf-after-signin", redirectTo);
          const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/signin" });
          if (res.error) {
            setErr("Google sign-in didn't work. Please try again.");
            setBusy(false);
          }
        }}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-[15px] font-medium transition-colors hover:bg-control-fill/50 disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      {err && <p className="mt-2 text-[13px] text-destructive">{err}</p>}
      <div className="my-5 flex items-center gap-3 text-[13px] text-secondary-text">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

type FieldDef = {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
};

export function FieldGroup({ fields, error }: { fields: FieldDef[]; error?: string | null }) {
  return (
    <div>
      <div
        className={cn(
          "overflow-hidden rounded-sm bg-card",
          error ? "outline outline-1 outline-destructive" : "outline outline-[0.5px] outline-border",
        )}
      >
        {fields.map((f, i) => (
          <div key={f.id} className={cn(i > 0 && "border-t border-border")}>
            <label htmlFor={f.id} className="sr-only">
              {f.label}
            </label>
            <input
              id={f.id}
              name={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              required
              placeholder={f.label}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              aria-invalid={!!error}
              className="h-12 w-full bg-transparent px-4 text-[15px] placeholder:text-secondary-text focus-visible:outline-none"
            />
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function plainAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That password doesn't match this email.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered")) return "There's already an account with this email. Try signing in.";
  if (m.includes("password") && (m.includes("least") || m.includes("short"))) return "Please use a password with at least 6 characters.";
  if (m.includes("weak") || m.includes("pwned")) return "That password is too easy to guess. Please pick another.";
  if (m.includes("rate")) return "Too many tries. Please wait a minute and try again.";
  return "Something went wrong. Please try again.";
}
