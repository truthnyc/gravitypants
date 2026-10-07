import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf, signOutEverywhere, useMe, type Me } from "@/lib/stillframe/account";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BrandSite } from "@/lib/site/brand-site";
import { usePlanAccess } from "@/lib/stillframe/plan";

/** Which brand this visit is on (decided once per request by hostname). */
export function useBrandSite(): BrandSite {
  const ctx = useRouteContext({ from: "__root__" }) as { site?: BrandSite };
  return ctx.site ?? "gravitypants";
}

export function AimanteLogo({ footer = false }: { footer?: boolean }) {
  return (
    <span className="flex flex-col items-start gap-0 whitespace-nowrap text-left">
      <span className={cn("block font-semibold !leading-[0.82] text-ap-ink", footer ? "text-[20px] tracking-[-0.04em]" : "text-[24px] tracking-[-0.04em] md:text-[28px]")}>Aimanté</span>
      <span className="block pl-[1px] text-[10px] !leading-none tracking-normal text-ap-muted">by Gravity Pants</span>
    </span>
  );
}

const navLink = "text-[14px] text-site-nav hover:text-ap-ink";

function useSavedCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["aimante-saved-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const sb = supabase as any;
      const [a, b] = await Promise.all([
        sb.from("directory_reel_favorites").select("reel_id", { count: "exact", head: true }),
        sb.from("site_reel_favorites").select("reel_id", { count: "exact", head: true }),
      ]);
      return (a.count ?? 0) + (b.count ?? 0);
    },
  }).data ?? 0;
}

function Avatar({ me, small = false }: { me: Me; small?: boolean }) {
  return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-ap-soft-blue font-semibold text-ap-blue ring-2 ring-ap-blue", small ? "size-7 text-[11px]" : "size-9 text-[13px]")}>{initialsOf(me)}</span>;
}

function useAimanteSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => { await signOutEverywhere(qc); navigate({ to: "/directory", replace: true }); };
}

const ACCOUNT_LINKS = (saved: number, stats = false) => [
  { label: "Your brand page", to: "/app/account/directory" as const },
  ...(stats ? [{ label: "Brand stats", to: "/app/account/stats" as const }] : []),
  { label: "Saved reels", to: "/app/account/favorites" as const, count: saved },
  { label: "Make reels on Gravity Pants ↗", href: "https://gravitypants.com/app/ads" },
  { label: "Account settings", to: "/app/account" as const },
];

function AccountMenu({ me }: { me: Me }) {
  const saved = useSavedCount(me.id);
  const signOut = useAimanteSignOut();
  const { data: access, canUse } = usePlanAccess();
  const statsOk = !!access && canUse("brand_stats");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Your account" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ap-blue"><Avatar me={me} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[280px] rounded-[12px] border-aimante-divider bg-ap-card p-2 font-ap shadow-aimante-menu">
        <div className="px-3 py-2.5"><p className="truncate text-[15px] font-semibold text-ap-ink">{me.displayName || me.email}</p>{me.displayName && <p className="truncate text-[13px] text-ap-muted">{me.email}</p>}</div>
        <DropdownMenuSeparator className="bg-aimante-divider" />
        {ACCOUNT_LINKS(saved, statsOk).map((l) => (
          <DropdownMenuItem key={l.label} asChild className="h-10 cursor-pointer rounded-lg px-3 text-[14px] text-ap-ink">
            {"href" in l ? <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a> : <Link to={l.to} className="flex justify-between">{l.label}{"count" in l && <span className="text-ap-muted tabular-nums">{l.count}</span>}</Link>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-aimante-divider" />
        <DropdownMenuItem onSelect={() => void signOut()} className="h-10 cursor-pointer rounded-lg px-3 text-[14px] text-ap-ink">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
const navActive = { className: "!text-ap-ink font-semibold" };

export function AimanteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  const me = useMe().data ?? null;
  const saved = useSavedCount(me?.id);
  const { data: statsAccess, canUse: statsCanUse } = usePlanAccess();
  const statsOk = !!statsAccess && statsCanUse("brand_stats");
  const signOut = useAimanteSignOut();
  const here = useRouterState({ select: (s) => s.location.pathname + s.location.searchStr });
  const signInSearch = { redirect: here };
  const listSearch = { redirect: "/aimante/join#apply" };
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
      if (e.key === "Tab") {
        const links = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
        const first = links[0];
        const last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); menuButton.current?.focus(); }
        else if (e.shiftKey && document.activeElement === menuButton.current) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuButton.current?.focus(); }
        else if (!e.shiftKey && document.activeElement === menuButton.current) { e.preventDefault(); first?.focus(); }
      }
    };
    const media = window.matchMedia("(min-width: 768px)");
    const resize = () => { if (media.matches) setOpen(false); };
    document.addEventListener("keydown", key);
    media.addEventListener("change", resize);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", key); media.removeEventListener("change", resize); };
  }, [open]);
  const row = "flex h-14 items-center justify-between border-b border-aimante-divider text-[20px] font-semibold text-ap-ink hover:bg-ap-panel";
  const chevron = <ChevronRight size={20} strokeWidth={1.7} className="shrink-0 text-ap-headline-bracket" aria-hidden="true" />;
  return (
    <header className="sticky top-0 z-50 border-b border-aimante-divider bg-ap-card font-ap">
      <div className="mx-auto grid h-[55px] max-w-[1280px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:h-[63px] md:px-10">
        <Link to="/directory" onClick={close} aria-label="Aimanté home" className="min-w-0 w-fit"><AimanteLogo /></Link>
        <nav aria-label="Main" className="hidden shrink-0 items-center gap-7 md:flex">
          <Link to="/aimante/about" className={navLink} activeProps={navActive}>About</Link>
          <Link to="/aimante/join" className={navLink} activeProps={navActive} activeOptions={{ includeHash: false }}>For brands</Link>
          {!me && <Link to="/signin" search={signInSearch} className={navLink} activeProps={navActive}>Sign in</Link>}
          {!me && (
            <Button asChild variant="site" className="h-9 min-h-0 rounded-lg bg-ap-blue px-4 text-[14px] text-ap-card hover:bg-ap-blue-hover">
              <Link to="/signin" search={listSearch}>List your brand</Link>
            </Button>
          )}
          {me && <AccountMenu me={me} />}
        </nav>
        <div className="flex items-center gap-1 md:hidden">
        {me && <Avatar me={me} small />}
        <Button ref={menuButton} variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="aimante-mobile-menu" onClick={() => setOpen((o) => !o)} className="size-11 min-h-0 min-w-0 shrink-0 text-ap-ink md:hidden">
          {open ? <X size={24} strokeWidth={1.7} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </Button>
        </div>
      </div>
      {open && <>
        <div className="absolute inset-x-0 top-full h-dvh bg-aimante-dim md:hidden" onClick={() => { close(); menuButton.current?.focus(); }} aria-hidden="true" />
        <nav ref={panel} id="aimante-mobile-menu" aria-label="Mobile navigation" className="absolute inset-x-0 top-full max-h-[calc(100dvh-56px)] overflow-y-auto rounded-b-[12px] bg-ap-card px-6 pb-6 shadow-aimante-menu md:hidden">
          <Link to="/directory" onClick={close} className={row}>Browse{chevron}</Link>
          <Link to="/aimante/about" onClick={close} className={row}>About{chevron}</Link>
          <Link to="/aimante/join" onClick={close} className={row}>For brands{chevron}</Link>
          {!me && <Link to="/signin" search={listSearch} onClick={close} className={cn(row, "text-ap-blue")}>List your brand{chevron}</Link>}
          {me ? <>
            <div className="mt-5 flex items-center gap-3 rounded-[12px] bg-ap-panel p-3"><Avatar me={me} /><div className="min-w-0"><p className="truncate text-[15px] font-semibold text-ap-ink">{me.displayName || me.email}</p>{me.displayName && <p className="truncate text-[13px] text-ap-muted">{me.email}</p>}</div></div>
            {ACCOUNT_LINKS(saved).map((l) => "href" in l
              ? <a key={l.label} href={l.href} target="_blank" rel="noreferrer" onClick={close} className="flex h-12 items-center border-b border-aimante-divider text-[16px] text-site-nav hover:text-ap-ink">{l.label}</a>
              : <Link key={l.label} to={l.to} onClick={close} className="flex h-12 items-center justify-between border-b border-aimante-divider text-[16px] text-site-nav hover:text-ap-ink">{l.label}{"count" in l && <span className="text-ap-muted tabular-nums">{l.count}</span>}</Link>)}
            <a href="#" onClick={(e) => { e.preventDefault(); close(); void signOut(); }} className="flex h-12 items-center text-[16px] text-site-nav hover:text-ap-ink">Sign out</a>
          </> : <>
            <Link to="/signin" search={signInSearch} onClick={close} className="flex h-14 items-center text-[16px] text-site-nav hover:text-ap-ink">Sign in</Link>
            <a href="https://gravitypants.com" onClick={close} className="inline-flex min-h-10 items-center text-[13px] text-ap-muted hover:text-ap-blue">Make reels with Gravity Pants →</a>
          </>}
        </nav>
      </>}
    </header>
  );
}

export function AimanteFooter() {
  return (
    <footer className="mt-auto border-t border-aimante-divider bg-ap-card font-ap">
      <div className="mx-auto grid max-w-[1280px] gap-y-4 px-4 py-8 text-[14px] leading-[1.3] text-ap-muted md:px-10 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-x-8 md:gap-y-6 md:py-12">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/directory" aria-label="Aimanté home"><AimanteLogo footer /></Link>
          <span className="hidden whitespace-nowrap text-[14px] text-ap-muted tabular-nums md:block">© {new Date().getFullYear()} Gravity Pants</span>
        </div>
        <nav aria-label="Footer" className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-2.5 md:flex md:flex-wrap md:items-center md:justify-end md:gap-x-5 md:gap-y-3">
          <Link to="/aimante/join" className="hover:text-ap-ink">List your brand</Link>
          <Link to="/aimante/about" className="hover:text-ap-ink">About</Link>
          <Link to="/privacy" className="hover:text-ap-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ap-ink">Terms</Link>
          <a href="https://gravitypants.com" className="col-span-2 mt-1 text-ap-blue hover:underline">Make reels with Gravity Pants</a>
        </nav>
        <span className="-mt-1 text-[12px] text-ap-muted tabular-nums md:hidden">© {new Date().getFullYear()} Gravity Pants</span>
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
      <Link to="/aimante/join" className="font-medium text-ap-blue hover:underline">List your brand free →</Link>
    </p>
  );
}
