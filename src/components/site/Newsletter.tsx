import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getNewsletterPopup, subscribeNewsletter } from "@/lib/site/newsletter.functions";
import { DEFAULT_POPUP } from "@/lib/site/newsletter";
import { photoSrc } from "@/lib/site/homepage";
import { cn } from "@/lib/utils";

const KEY = "gp-newsletter";

function useSubscribe(source: "popup" | "footer") {
  const subscribe = useServerFn(subscribeNewsletter);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) {
      setState("error");
      setError("Enter a valid email address.");
      return;
    }
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
  if (state === "done")
    return (
      <p className="text-[14px] text-site-ink" role="status">
        Thanks! Check your inbox to confirm.
      </p>
    );
  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn("flex w-full", stacked ? "flex-col gap-3" : "flex-col gap-2 sm:flex-row")}
    >
      <label htmlFor={`nl-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`nl-${source}`}
        name="email"
        type="email"
        required
        maxLength={255}
        autoComplete="email"
        placeholder="you@brand.com"
        className="h-12 min-h-12 min-w-0 w-full shrink-0 rounded-[4px] border border-site-line bg-site-page px-3.5 text-[15px] text-site-ink outline-none focus:border-site-primary sm:w-auto sm:flex-1"
      />
      <Button
        type="submit"
        variant="site"
        size="siteHeader"
        className={cn("h-12 min-h-12", stacked ? "mt-1 w-full" : "sm:w-auto")}
        disabled={state === "busy"}
      >
        {state === "busy" ? <Loader2 size={16} strokeWidth={1.7} className="animate-spin" /> : "Subscribe"}
      </Button>
      {state === "error" && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function FooterNewsletter() {
  return (
    <div className="rounded-[18px] bg-ap-card p-5">
      <p className="text-[15px] font-semibold text-ap-ink">Notes from the studio</p>
      <p className="mb-3 mt-1 text-[13px] text-ap-body">New templates, examples and ideas, about once a month. Leave whenever you like.</p>
      <Form source="footer" />
    </div>
  );
}

/** True while something the visitor is using is open: a filter panel, reel popup, Stage or a focused search/text field. */
export function popupBlocked(doc: Document) {
  if (doc.querySelector('[role="dialog"], [id^="dir-panel-"], [data-stage-view]')) return true;
  const a = doc.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT");
}
/** Past the first page of reels: the end-of-grid marker is on screen; without one, after two screens or at the page bottom. */
export function pastFirstPage(doc: Document, win: Window) {
  const mark = doc.querySelector("[data-newsletter-after]");
  if (mark) return mark.getBoundingClientRect().top < win.innerHeight;
  const bottom = win.scrollY > 0 && win.scrollY + win.innerHeight >= doc.documentElement.scrollHeight - 200;
  return bottom || win.scrollY > win.innerHeight * 2;
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const load = useServerFn(getNewsletterPopup);
  const content = useQuery({ queryKey: ["site", "newsletter-popup"], queryFn: () => load(), staleTime: 5 * 60 * 1000 });
  const c = content.data ?? DEFAULT_POPUP;

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    let wanted = false;
    let done = false;
    const show = () => {
      if (done || localStorage.getItem(KEY)) return;
      done = true;
      localStorage.setItem(KEY, "shown"); // once per visitor, whatever they do next
      setOpen(true);
      cleanup();
    };
    // Wait while a filter panel, search box, reel popup or Stage is in use.
    const tryShow = () => { wanted = true; if (!popupBlocked(document)) show(); };
    const onScroll = () => { if (!wanted && pastFirstPage(document, window)) tryShow(); };
    const onLeave = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0) tryShow(); };
    const fine = window.matchMedia("(pointer: fine)").matches;
    const poll = window.setInterval(() => { if (wanted) tryShow(); }, 1000);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (fine) document.addEventListener("mouseout", onLeave);
    function cleanup() {
      window.clearInterval(poll);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
    }
    return cleanup;
  }, []);
  const close = (v: boolean) => {
    setOpen(v);
    if (!v && !localStorage.getItem(KEY)) localStorage.setItem(KEY, "dismissed");
  };

  if (!c.enabled) return null;
  const showImage = c.showImage && c.image;
  const split = c.layout === "split" && showImage;

  const textBlock = (
    <div className={cn("flex-1", split ? "px-7 py-8 sm:px-9 sm:py-10" : "px-7 py-9 sm:px-10 sm:py-11")}>
      {c.eyebrow && (
        <span className="inline-block rounded-full bg-site-soft-blue px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site-eyebrow">
          {c.eyebrow}
        </span>
      )}
      <DialogTitle className="mt-4 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-site-ink">
        {c.line1}
        {c.line2 && (
          <>
            <br />
            <span className="text-site-primary">{c.line2}</span>
          </>
        )}
      </DialogTitle>
      {c.description && (
        <DialogDescription className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-site-muted">
          {c.description}
        </DialogDescription>
      )}
      <div className="mt-8">
        <Form source="popup" stacked />
      </div>
      {c.note && <p className="mt-4 text-[12px] font-medium text-site-muted">{c.note}</p>}
    </div>
  );

  const imageBlock = showImage && c.image && (
    <div
      className={cn(
        "shrink-0 items-center justify-center bg-site-panel",
        split ? "hidden w-[220px] border-l border-site-line p-8 md:flex" : "flex border-t border-site-line p-6",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[4px] border border-site-line bg-site-inner shadow-[0_20px_40px_rgb(0_0_0/0.12)]",
          split ? "aspect-[9/19] w-full" : "aspect-[16/9] w-full max-w-[420px]",
        )}
      >
        <img src={photoSrc(c.image)} alt={c.image.alt} className="absolute inset-0 h-full w-full object-cover" />
        {split && (
          <div className="absolute inset-x-4 bottom-4 flex h-1.5 gap-1.5">
            <span className="h-full w-1/3 rounded-full bg-white/60" />
            <span className="h-full flex-1 rounded-full bg-white/30" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className={cn(
          "overflow-hidden rounded-[4px] bg-site-page p-0 font-site",
          split ? "max-w-[640px]" : "max-w-[480px]",
        )}
      >
        {split ? (
          <div className="flex">
            {textBlock}
            {imageBlock}
          </div>
        ) : (
          <div>
            {textBlock}
            {imageBlock}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
