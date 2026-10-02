import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { subscribeNewsletter } from "@/lib/site/newsletter.functions";

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

function Form({ source }: { source: "popup" | "footer" }) {
  const { state, error, submit } = useSubscribe(source);
  if (state === "done") return <p className="text-[14px] text-site-ink" role="status">Thanks! Check your inbox to confirm.</p>;
  return (
    <form onSubmit={submit} noValidate className="flex w-full flex-col gap-2">
      <div className="flex w-full gap-2">
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input id={`nl-${source}`} name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@brand.com"
          className={`h-11 min-w-0 flex-1 rounded-[4px] border border-site-line px-3 text-[15px] text-site-ink outline-none focus:border-site-primary bg-site-page`} />
        <Button type="submit" variant="site" size="siteHeader" className="h-11" disabled={state === "busy"}>
          {state === "busy" ? <Loader2 size={16} strokeWidth={1.7} className="animate-spin" /> : "Subscribe"}
        </Button>
      </div>
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
      <DialogContent className="max-w-[420px] rounded-[4px] bg-site-page p-7 font-site">
        <DialogTitle className="text-[22px] font-semibold text-site-ink">Better reels, in your inbox</DialogTitle>
        <DialogDescription className="text-[15px] text-site-muted">
          Get new templates, real brand examples and quick tips for turning photos into ads.
        </DialogDescription>
        <Form source="popup" />
      </DialogContent>
    </Dialog>
  );
}

