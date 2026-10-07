import { Link, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { BrandSite } from "@/lib/site/brand-site";

/** Which brand this visit is on (decided once per request by hostname). */
export function useBrandSite(): BrandSite {
  const ctx = useRouteContext({ from: "__root__" }) as { site?: BrandSite };
  return ctx.site ?? "gravitypants";
}

export function AimanteLogo() {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-[19px] font-semibold tracking-[-0.02em] text-ap-ink">Aimanté</span>
      <span className="text-[13px] text-ap-muted">— by Gravity Pants</span>
    </span>
  );
}

const primary = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-ap-blue px-4 text-[14px] font-medium text-ap-card hover:bg-ap-blue-hover";

function AimanteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ap-hairline bg-ap-card/[.92] backdrop-blur-[14px] safe-top">
      <div className="mx-auto flex h-[63px] max-w-[1280px] items-center px-4 md:px-6">
        <Link to="/directory" aria-label="Aimanté home" className="shrink-0"><AimanteLogo /></Link>
        <Link to="/aimante/join" className={cn(primary, "ml-auto")}>List your brand</Link>
      </div>
    </header>
  );
}

function AimanteFooter() {
  return (
    <footer className="mt-auto border-t border-ap-hairline bg-ap-panel font-ap text-ap-ink">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-3 px-6 py-8 text-[13px] text-ap-muted">
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
