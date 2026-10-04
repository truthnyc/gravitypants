import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { subscribeNewsletter } from "@/lib/site/newsletter.functions";
import { cn } from "@/lib/utils";

const KEY = "gp-newsletter";

function useSubscribe(source: "popup" | "footer") {
  const subscribe = useServerFn(subscribeNewsletter);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) { setState("error"); setError("Enter a valid email address."); return; }
    setState("busy");
    try {
      await subscribe({ data: { email, source } });
      localStorage.setItem(KEY, "subscribed");
      setState("done");
    } catch {
      setState("error");
      setError("We couldn't sign you up. Please try again.");
    }
  };
  return { state, error, submit };
}

function Form({ source, stacked = false }: { source: "popup" | "footer"; stacked?: boolean }) {
  const { state, error, submit } = useSubscribe(source);
  if (state === "done") return <p className="text-[14px] text-site-ink" role="status">Thanks! Check your inbox to confirm.</p>;
  return (
    <form onSubmit={submit} noValidate className={cn("flex w-full gap-2", stacked ? "flex-col" : "flex-col sm:flex-row")}>
      <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
      <input id={`nl-${source}`} name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@brand.com"
        className={`h-11 min-w-0 flex-1 rounded-[4px] border border-site-line px-3 text-[15px] text-site-ink outline-none focus:border-site-primary bg-site-page`} />
      <Button type="submit" variant="site" size="siteHeader" className={cn("h-11", stacked ? "w-full" : "sm:w-auto")} disabled={state === "busy"}>
        {state === "busy" ? <Loader2 size={16} strokeWidth={1.7} className="animate-spin" /> : "Subscribe"}
      </Button>
      {state === "error" && <p className="text-[13px] text-destructive" role="alert">{error}</p>}
    </form>
  );
}

export function FooterNewsletter() {
  return (
    <div className="max-w-[360px]">
      <p className="text-[14px] font-semibold">Get reel tips by email</p>
      <p className="mb-3 mt-1 text-[13px] text-site-muted">New templates, examples and ideas. No spam.</p>
      <Form source="footer" />
    </div>
  );
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const t = window.setTimeout(() => setOpen(true), 12000);
    return () => window.clearTimeout(t);
  }, []);
  const close = (v: boolean) => {
    setOpen(v);
    if (!v && !localStorage.getItem(KEY)) localStorage.setItem(KEY, "dismissed");
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[640px] overflow-hidden rounded-[4px] bg-site-page p-0 font-site">
        <div className="flex">
          <div className="flex-1 px-7 py-8 sm:px-9 sm:py-10">
            <span className="inline-block rounded-full bg-site-soft-blue px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site-eyebrow">
              Reel tips
            </span>
            <DialogTitle className="mt-4 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-site-ink">
              Better reels,<br /><span className="text-site-primary">in your inbox</span>
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-site-muted">
              Get new templates, real brand examples and quick tips for turning photos into ads.
            </DialogDescription>
            <div className="mt-7">
              <Form source="popup" stacked />
            </div>
            <p className="mt-4 text-[12px] font-medium text-site-muted">Join the Gravity Pants creative community.</p>
          </div>
          <div className="hidden w-[220px] shrink-0 items-center justify-center border-l border-site-line bg-site-panel p-8 md:flex">
            <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[4px] border border-site-line bg-site-inner shadow-[0_20px_40px_rgb(0_0_0/0.12)]">
              <img src={photo1.url} alt="Reel frame from a Gravity Pants ad" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-x-4 bottom-4 flex h-1.5 gap-1.5">
                <span className="h-full w-1/3 rounded-full bg-white/60" />
                <span className="h-full flex-1 rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
