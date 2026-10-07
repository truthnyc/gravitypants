import { Link, useRouteContext, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BrandSite } from "@/lib/site/brand-site";

/** Which brand this visit is on (decided once per request by hostname). */
export function useBrandSite(): BrandSite {
  const ctx = useRouteContext({ from: "__root__" }) as { site?: BrandSite };
  return ctx.site ?? "gravitypants";
}

type Item = { label: string; to: string; hash?: string };
// Internal paths; the router shows them as /, /join, /about on aimante.co.
const NAV: Item[] = [
  { label: "Browse", to: "/directory" },
  { label: "Categories", to: "/directory", hash: "categories" },
  { label: "Moods", to: "/directory", hash: "moods" },
  { label: "List your brand", to: "/aimante/join" },
  { label: "About", to: "/aimante/about" },
];

const navLink = "rounded-lg px-2.5 py-[7px] text-[14px] text-ap-ink transition-colors hover:bg-ap-panel";
const primary = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-ap-blue px-4 text-[14px] font-medium text-ap-card hover:bg-ap-blue-hover";

export function AimanteLogo() {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-[19px] font-semibold tracking-[-0.02em] text-ap-ink">Aimanté</span>
      <span className="text-[13px] text-ap-muted">— by Gravity Pants</span>
    </span>
  );
}

function openPanel(hash?: string) {
  if (!hash || typeof document === "undefined") return;
  // Categories / Moods jump to the filter bar and open that panel.
  setTimeout(() => {
    const label = hash === "moods" ? "Mood" : "Category";
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-haspopup], button[aria-expanded]"))
      .find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().startsWith(label));
    btn?.scrollIntoView({ block: "center" });
    btn?.click();
  }, 60);
}

function NavLinks({ onPick }: { onPick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {NAV.map((n) => (
        <Link key={n.label} to={n.to as "/"} onClick={() => { onPick?.(); openPanel(n.hash); }}
          className={cn(navLink, !n.hash && pathname === n.to && "bg-ap-soft-blue font-semibold text-ap-blue-strong")}>{n.label}</Link>
      ))}
    </>
  );
}

function AimanteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="sticky top-0 z-50 border-b border-ap-hairline bg-ap-card/[.92] backdrop-blur-[14px] safe-top">
      <div className="mx-auto flex h-[63px] max-w-[1280px] items-center gap-3 px-4 md:px-6 lg:gap-5">
        <Link to="/directory" aria-label="Aimanté home" className="shrink-0"><AimanteLogo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex"><NavLinks /></nav>
        <Link to="/aimante/join" className={cn(primary, "ml-auto hidden sm:inline-flex")}>List your brand</Link>
        <button type="button" className="ml-auto grid size-9 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel sm:ml-0 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="aimante-menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
        </button>
      </div>
      {open && (
        <nav id="aimante-menu" aria-label="Menu" className="flex flex-col gap-1 border-t border-ap-hairline bg-ap-card px-4 py-3 lg:hidden">
          <NavLinks onPick={() => setOpen(false)} />
          <Link to="/aimante/join" className={cn(primary, "mt-2")}>List your brand</Link>
        </nav>
      )}
    </header>
  );
}

function AimanteFooter() {
  return (
    <footer className="mt-auto border-t border-ap-hairline bg-ap-panel font-ap text-ap-ink">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-3 px-6 py-8 text-[13px] text-ap-muted">
        <AimanteLogo />
        <span className="nums">© {new Date().getFullYear()} Gravity Pants</span>
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
