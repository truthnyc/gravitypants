import { Link, useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandSite } from "@/lib/site/brand-site";

/** Which brand this visit is on (decided once per request by hostname). */
export function useBrandSite(): BrandSite {
  const ctx = useRouteContext({ from: "__root__" }) as { site?: BrandSite };
  return ctx.site ?? "gravitypants";
}

export function AimanteLogo() {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-[32px] font-semibold tracking-[-0.035em] text-ap-ink">Aimanté</span>
      <span className="text-[13px] text-ap-muted">— by Gravity Pants</span>
    </span>
  );
}

const primary = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-ap-blue px-4 text-[14px] font-medium text-ap-card hover:bg-ap-blue-hover";
const navLink = "text-[14px] text-site-nav hover:text-ap-ink";
const navActive = { className: "!text-ap-ink font-semibold" };

function AimanteHeader() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <header className="sticky top-0 z-50 border-b border-ap-hairline bg-ap-card/[.92] backdrop-blur-[14px] safe-top tracking-[-0.035em]">
      <div className="mx-auto flex h-[63px] max-w-[1280px] items-center gap-3 px-4 md:px-6">
        <Link to="/directory" aria-label="Aimanté home" className="shrink-0"><AimanteLogo /></Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-9 md:flex">
          <Link to="/aimante/about" className={navLink} activeProps={navActive}>About</Link>
          <Link to="/aimante/join" className={navLink} activeProps={navActive} activeOptions={{ includeHash: false }}>For brands</Link>
        </nav>
        <Link to="/aimante/join" hash="apply" className={cn(primary, "ml-auto md:ml-6")}>List your brand</Link>
        <div ref={wrap} className="relative md:hidden">
          <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-9 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel">
            {open ? <X className="size-5" strokeWidth={1.7} /> : <Menu className="size-5" strokeWidth={1.7} />}
          </button>
          {open && (
            <div className="absolute right-0 top-11 w-44 rounded-lg bg-ap-card p-1.5 shadow-ap-soft ring-1 ring-ap-hairline">
              <Link to="/aimante/about" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[14px] text-site-nav hover:bg-ap-panel" activeProps={navActive}>About</Link>
              <Link to="/aimante/join" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[14px] text-site-nav hover:bg-ap-panel" activeProps={navActive}>For brands</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AimanteFooter() {
  return (
    <footer className="mt-auto border-t border-ap-hairline bg-ap-panel font-ap text-ap-ink">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-baseline gap-x-5 gap-y-3 px-6 py-8 text-[13px] text-ap-muted">
        <AimanteLogo />
        <span className="nums">© {new Date().getFullYear()} Gravity Pants</span>
        <Link to="/aimante/join" className="hover:text-ap-blue">List your brand</Link>
        <Link to="/aimante/about" className="hover:text-ap-blue">About</Link>
        <Link to="/privacy" className="hover:text-ap-blue">Privacy</Link>
        <Link to="/terms" className="hover:text-ap-blue">Terms</Link>
        <a href="https://gravitypants.com" className="ml-auto hover:text-ap-blue">Make reels with Gravity Pants</a>
      </div>
    </footer>
  );
}

export function AimanteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-site-page font-site text-site-ink">
      <AimanteHeader />
      <main className="min-h-[48dvh] flex-1">{children}</main>
      <AimanteFooter />
    </div>
  );
}

/** Closing line on every Aimanté brand page. */
export function MadeWithGravityPants() {
  return (
    <p className="mx-auto max-w-[1440px] px-6 pb-16 text-center text-[15px] text-ap-body sm:px-8 lg:px-10">
      Reels made with Gravity Pants.{" "}
      <a href="https://gravitypants.com" className="font-medium text-ap-blue hover:underline">Make yours →</a>
    </p>
  );
}
