import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { AimanteLogo, useBrandSite } from "@/components/site/AimanteShell";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export function safeRedirect(r: unknown, fallback = "/app/ads"): string {
  if (typeof r !== "string" || !r) return fallback;
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin || !r.startsWith("/") || r.startsWith("//")) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

export function AuthShell({ eyebrow, title, subtitle, children, beforeForm }: { eyebrow?: string; title: string; subtitle: string; children: ReactNode; mode?: "signup" | "signin"; beforeForm?: ReactNode }) {
  const aim = useBrandSite() === "aimante";
  const router = useRouter();
  const home = aim ? "/directory" : "/";
  const back = () => { if (window.history.length > 1) router.history.back(); else void router.navigate({ to: home }); };
  return (
    <div className="brand-auth flex min-h-dvh flex-col bg-ap-panel font-ap text-ap-ink">
      <header className="border-b border-aimante-divider bg-ap-card">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 md:h-16 md:px-6">
          <Link to={home} aria-label={aim ? "Aimanté home" : "Gravity Pants home"} className="flex items-center gap-2">
            {aim ? <AimanteLogo /> : <><GravityPantsLogo size={28} /><span className="text-[19px] font-semibold tracking-[-0.035em]">Gravity Pants</span></>}
          </Link>
          <Link to={home} className="hidden items-center gap-1.5 text-[14px] text-site-nav hover:text-ap-ink md:inline-flex"><ArrowLeft size={16} strokeWidth={1.7} aria-hidden />{aim ? "Back to browsing" : "Back to Gravity Pants"}</Link>
          <Button type="button" variant="ghost" size="icon" aria-label="Go back" onClick={back} className="size-11 min-h-0 min-w-0 text-ap-ink md:hidden"><X size={22} strokeWidth={1.7} /></Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center px-5 py-8 md:px-6 md:py-16">
        <div className="w-full max-w-[420px] md:rounded-[12px] md:bg-ap-card md:p-8 md:shadow-ap-soft">
          {eyebrow && <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ap-blue">{eyebrow}</p>}
          <h1 className="whitespace-pre-line text-[28px] font-semibold leading-[1.1] tracking-[-0.035em]">{title}</h1>
          <p className="mt-2 text-[15px] leading-[1.45] text-ap-body">{subtitle}</p>
          {beforeForm}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-[13px] text-ap-muted">{aim ? "One account for Aimanté and Gravity Pants." : "One account for Gravity Pants and Aimanté."} <Link to="/privacy" className="hover:text-ap-ink">Privacy</Link> · <Link to="/terms" className="hover:text-ap-ink">Terms</Link></p>
      </main>
    </div>
  );
}

export function GoogleButton({ redirectTo, onStart }: { redirectTo: string; onStart?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const site = useBrandSite();
  return (
    <>
      <Button
        type="button"
        variant="siteSecondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          onStart?.();
          sessionStorage.setItem("sf-after-signin", redirectTo);
          try {
            const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + (site === "aimante" ? "/sign-in" : "/signin") });
            if (res.error) {
              sessionStorage.removeItem("gravity-pants:welcome");
              setErr("Google sign-in didn't work. Please try again.");
              setBusy(false);
            }
          } catch {
            sessionStorage.removeItem("gravity-pants:welcome");
            setErr("Google sign-in didn't work. Please try again.");
            setBusy(false);
          }
        }}
        className="auth-google"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </Button>
      {err && <p className="mt-2 text-[13px] text-destructive">{err}</p>}
      <div className="auth-divider">
        <span />
        or with email
        <span />
      </div>
    </>
  );
}

export type FieldDef = {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  placeholder?: string;
  error?: string | null;
  labelAction?: ReactNode;
  onChange: (v: string) => void;
};

export function FieldGroup({ fields, error }: { fields: FieldDef[]; error?: string | null }) {
  const [shown, setShown] = useState<Record<string, boolean>>({});
  return (
    <div className="auth-fields">
      {fields.map((f) => {
        const isPassword = f.type === "password";
        const type = isPassword && shown[f.id] ? "text" : f.type;
        return (
          <div key={f.id} className="auth-field">
            {f.labelAction ? <div className="auth-label-row"><label htmlFor={f.id}>{f.label}</label>{f.labelAction}</div> : <label htmlFor={f.id}>{f.label}</label>}
            <div className="auth-input-wrap">
              <input
                id={f.id}
                name={f.id}
                type={type}
                autoComplete={f.autoComplete}
                required
                placeholder={f.placeholder ?? f.label}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                aria-invalid={!!f.error}
                aria-describedby={f.error ? `${f.id}-error` : undefined}
              />
              {isPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  className="auth-show"
                  onClick={() => setShown((s) => ({ ...s, [f.id]: !s[f.id] }))}
                  aria-label={shown[f.id] ? "Hide password" : "Show password"}
                >
                  {shown[f.id] ? "Hide" : "Show"}
                </Button>
              )}
            </div>
            {f.error && <p role="alert" id={`${f.id}-error`} className="auth-field-error">{f.error}</p>}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function plainAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered") || m.includes("user already exists")) return "That email is already in use. Sign in instead?";
  if (m.includes("password") && (m.includes("least") || m.includes("short"))) return "Please use a password with at least 8 characters.";
  if (m.includes("weak") || m.includes("pwned")) return "That password is too easy to guess. Please pick another.";
  if (m.includes("rate")) return "Too many tries. Please wait a minute and try again.";
  return "Something went wrong. Please try again.";
}
