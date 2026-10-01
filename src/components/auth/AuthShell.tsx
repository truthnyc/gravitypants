import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { ReelPhone } from "@/components/site/ReelPhone";
import { lovable } from "@/integrations/lovable";
import { FeaturedAdVideo } from "@/components/site/FeaturedAdVideo";
import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";

export function safeRedirect(r: unknown): string {
  if (typeof r !== "string") return "/app/ads";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return "/app/ads";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/app/ads";
  }
}

const candleFrames = ["#1F2937", "#8C2F2B", "#EBDDC6"].map((background, i) => ({
  background,
  artwork: <img src={`/site-art/candle-${i + 1}.svg`} alt="" />,
}));

function AuthVisual({ mode }: { mode: "signup" | "signin" }) {
  return <div className="auth-visual auth-hero" aria-hidden="true">
    {[photo1, photo2, photo3].map((p, i) => <div key={p.url} className={`auth-hero-drop auth-hero-drop-${i + 1}`}><img src={p.url} alt="" /></div>)}
    <div className="auth-hero-phone"><FeaturedAdVideo tapToggle /></div>
    {mode === "signup" ? (
      <div className="auth-hero-exported auth-hero-trial">
        <span>Your free trial includes</span>
        <div><span>3 exports</span><span>Every format</span></div>
        <b><Check size={14} strokeWidth={2} /> Every feature, incl. brand kit</b>
      </div>
    ) : (
      <div className="auth-hero-exported">
        <span>Exported</span>
        <div><span>9:16</span><span>1:1</span><span>16:9</span></div>
        <b><Check size={14} strokeWidth={2} /> MP4 + GIF ready</b>
      </div>
    )}
  </div>;
}

export function AuthShell({ eyebrow, title, subtitle, children, mode = "signup", beforeForm }: { eyebrow?: string; title: string; subtitle: string; children: ReactNode; mode?: "signup" | "signin"; beforeForm?: ReactNode }) {
  return (
    <main className={`auth-page auth-page-${mode}`}>
      <div className="auth-form-side">
        <a href="/" className="auth-brand">
          <GravityPantsLogo size={30} />
          <span>Gravity Pants</span>
        </a>
        <div className="auth-form-inner">
          {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {beforeForm}
          <div className="auth-form-body">{children}</div>
        </div>
      </div>
      <div className="auth-visual-side">
        <AuthVisual mode={mode} />
      </div>
    </main>
  );
}

export function GoogleButton({ redirectTo, onStart }: { redirectTo: string; onStart?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
            const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/signin" });
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
            <label htmlFor={f.id}>{f.label}</label>
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
