import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { useBrandSite } from "@/components/site/AimanteShell";

const STATUS_URL = "https://status.gravitypants.com";

export function ServiceUnavailable({ onRetry }: { onRetry: () => void }) {
  const site = useBrandSite();
  const isAimante = site === "aimante";

  return (
    <main className="flex min-h-dvh flex-col bg-ap-card font-ap text-ap-ink">
      <header className="border-b border-ap-hairline">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-5 sm:px-8">
          {isAimante ? (
            <span className="text-[28px] font-semibold tracking-[-0.035em]">Aimanté</span>
          ) : (
            <GravityPantsLogo size={28} showWordmark wordmarkSize={17} />
          )}
        </div>
      </header>
      <section className="mx-auto flex w-full max-w-[1280px] flex-1 items-center px-5 py-16 sm:px-8">
        <div className="max-w-[620px]">
          <div className="mb-8 flex items-center gap-2 text-[13px] font-medium text-ap-body">
            <span className="size-2 rounded-full bg-ap-amber" aria-hidden />
            Service temporarily unavailable
          </div>
          <h1 className="max-w-[560px] text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[58px]">We’ll be right back.</h1>
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ap-body">We’re having a temporary problem loading this page. Your work is safe. Please try again in a moment.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button type="button" size="large" onClick={onRetry}><RefreshCw className="size-4" strokeWidth={1.7} />Try again</Button>
            <Button asChild variant="outline" size="large"><Link to="/">Go home</Link></Button>
          </div>
          <a href={STATUS_URL} target="_blank" rel="noreferrer" className="mt-10 inline-flex text-[14px] text-ap-blue hover:underline">Check service status →</a>
        </div>
      </section>
      <footer className="border-t border-ap-hairline px-5 py-5 text-[12px] text-ap-muted sm:px-8">
        <div className="mx-auto max-w-[1280px]">© {new Date().getFullYear()} {isAimante ? "Aimanté — by Gravity Pants" : "Gravity Pants"}</div>
      </footer>
    </main>
  );
}