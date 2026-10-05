import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";
import { submitBrandRequest } from "@/lib/site/reels.functions";

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): { topic?: string } => (typeof s.topic === "string" ? { topic: s.topic } : {}),
  head: () => siteHead({ path: "/contact", title: "Contact — Get a reel for your brand | Gravity Pants", description: "Tell Gravity Pants about your brand and products, and we'll get back to you about a short video ad." }),
  component: Contact,
});

const field = "contact-input";

function Contact() {
  const send = useServerFn(submitBrandRequest);
  const [f, setF] = useState({ name: "", email: "", brand: "", website: "", message: "", company: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setState("sending");
    try {
      const r = await send({ data: f });
      if ("error" in r) { setError(r.error); setState("idle"); return; }
      setState("sent");
    } catch {
      setError("Please check your details and try again.");
      setState("idle");
    }
  };

  return (
    <SiteShell>
      <div className="examples-page">
        <section className="examples-hero examples-container">
          <span className="site-eyebrow">Contact</span>
          <div><h1>Want a reel<br />for your brand?</h1><p className="site-lede">Tell us a little about your brand. We reply within one business day.</p></div>
        </section>
        <section className="examples-container contact-section">
          <div className="site-card contact-card">
            {state === "sent" ? (
              <div className="contact-sent" role="status">
                <span className="contact-sent-icon"><Check size={22} strokeWidth={2} /></span>
                <h2>Thanks, we got it.</h2>
                <p>We'll reply to {f.email} soon.</p>
                <Button asChild variant="siteSecondary" size="site"><Link to="/showcase">See the showcase</Link></Button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={(e) => void submit(e)}>
                <label>Your name<input className={field} required maxLength={200} autoComplete="name" value={f.name} onChange={set("name")} /></label>
                <label>Email<input className={field} required type="email" maxLength={320} autoComplete="email" value={f.email} onChange={set("email")} /></label>
                <label>Brand<input className={field} required maxLength={200} autoComplete="organization" value={f.brand} onChange={set("brand")} /></label>
                <label>Website <span>(optional)</span><input className={field} maxLength={500} inputMode="url" placeholder="brand.com" value={f.website} onChange={set("website")} /></label>
                <label className="contact-wide">What would you like to promote? <span>(optional)</span><textarea className={field} rows={5} maxLength={5000} value={f.message} onChange={set("message")} /></label>
                <input className="contact-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company} onChange={set("company")} />
                {error && <p className="contact-error contact-wide" role="alert">{error}</p>}
                <div className="contact-wide"><Button type="submit" variant="site" size="site" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send"}</Button></div>
              </form>
            )}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
