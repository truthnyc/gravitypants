import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { MobileMenu } from "@/components/MobileNavMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { SHOW_DIRECTORY } from "@/lib/features";
import { useMe } from "@/lib/stillframe/account";
import { cn } from "@/lib/utils";
import { NewAdButton } from "@/components/stillframe/DropZone";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { Avatar, UserMenu, menuContent, menuItem, menuLabel } from "@/components/stillframe/UserMenu";
import { WorkspaceSwitcher } from "@/components/stillframe/WorkspaceSwitcher";
import { useSearch } from "@/components/stillframe/search-context";

type NavItem = { label: string; to: string; exact?: boolean };

const siteNav: NavItem[] = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "Examples", to: "/examples" },
  { label: "Showcase", to: "/showcase" },
  ...(SHOW_DIRECTORY ? [{ label: "Directory", to: "/directory" }] : []),
  { label: "Pricing", to: "/pricing" },
];
const exploreNav: NavItem[] = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "Examples", to: "/examples" },
  { label: "Showcase", to: "/showcase" },
  { label: "Pricing", to: "/pricing" },
  { label: "Blog", to: "/blog" },
];
const appNav: NavItem[] = [
  { label: "Your Ads", to: "/app/ads", exact: true },
  { label: "Brand Kit", to: "/app/brand" },
  { label: "Previous Exports", to: "/app/exports" },
  ...(SHOW_DIRECTORY ? [{ label: "Directory", to: "/directory" }] : []),
];

const navLink = "rounded-lg px-2.5 py-[7px] text-[14px] text-ap-ink transition-colors hover:bg-ap-panel";
const navActive = "bg-ap-soft-blue font-semibold text-ap-blue hover:bg-ap-soft-blue";
const btn = "inline-flex h-9 min-h-0 min-w-0 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-4 text-[14px] font-medium transition-colors disabled:opacity-60";
const primary = cn(btn, "bg-ap-blue text-ap-card hover:bg-ap-blue-hover");
const secondary = cn(btn, "bg-ap-panel text-ap-ink hover:bg-ap-hairline");

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <>
      {items.map((item) => (
        <Link key={item.to} to={item.to as "/"} className={cn(navLink, isActive(pathname, item) && navActive)}>{item.label}</Link>
      ))}
    </>
  );
}

const MenuButton = forwardRef<HTMLButtonElement, { open: boolean; onToggle: () => void; signedIn: boolean }>(function MenuButton({ open, onToggle, signedIn }, ref) {
  const { data: me } = useMe();
  return (
    <button ref={ref} type="button" className="relative grid size-9 min-h-0 min-w-0 shrink-0 place-items-center rounded-lg text-ap-ink hover:bg-ap-panel lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={onToggle}>
      {open ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
      {signedIn && !open && <span className="absolute -right-1 -bottom-1 rounded-full ring-2 ring-ap-card"><Avatar me={me} size={18} /></span>}
    </button>
  );
});

/** One header for the marketing site and the app (the editor keeps its own). */
export function SiteHeader({ variant }: { variant: "site" | "app" }) {
  const siteSignedIn = useSignedIn();
  const signedIn = variant === "app" || siteSignedIn;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const wasOpen = useRef(false);
  useEffect(() => close(), [pathname, close]);
  useEffect(() => {
    if (wasOpen.current && !open) menuButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-ap-hairline bg-ap-card/[.92] backdrop-blur-[14px] safe-top">
      <div className="mx-auto flex h-[63px] max-w-[1280px] items-center gap-3 px-4 md:px-6 lg:gap-5">
        <Link to={signedIn ? "/app/ads" : "/"} onClick={close} className="flex min-w-0 shrink-0 items-center text-ap-ink" aria-label="Gravity Pants home">
          <GravityPantsLogo size={28} showWordmark wordmarkSize={17} />
        </Link>
        {variant === "app" ? <AppBar pathname={pathname} /> : <SiteBar pathname={pathname} signedIn={signedIn} close={close} />}
        <MenuButton ref={menuButton} open={open} onToggle={() => setOpen((v) => !v)} signedIn={signedIn} />
      </div>
      <MobileMenu open={open} signedIn={signedIn} pathname={pathname} close={close} />
    </header>
  );
}

function SiteBar({ pathname, signedIn, close }: { pathname: string; signedIn: boolean; close: () => void }) {
  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 lg:flex"><NavLinks items={siteNav} pathname={pathname} /></nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
        {signedIn ? (
          <>
            <Link to="/app/ads" className={cn(secondary, "hidden lg:inline-flex")}>Your Ads</Link>
            <div className="hidden lg:block"><UserMenu websiteMenu /></div>
            <Link to="/app/ads" onClick={close} className={cn(primary, "lg:hidden")}>+ New ad</Link>
          </>
        ) : (
          <>
            <Link to="/signin" className="hidden h-9 min-h-0 items-center px-2 text-[14px] text-ap-ink hover:text-ap-blue md:inline-flex">Sign in</Link>
            <Link to="/signup" onClick={close} className={primary}>Start free</Link>
          </>
        )}
      </div>
    </>
  );
}

function AppBar({ pathname }: { pathname: string }) {
  const { query, setQuery } = useSearch();
  return (
    <>
      <div className="hidden min-w-0 md:block"><WorkspaceSwitcher /></div>
      <nav aria-label="App" className="hidden items-center gap-1 lg:flex">
        <NavLinks items={appNav} pathname={pathname} />
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(navLink, "inline-flex items-center gap-1")}>Explore <ChevronDown size={14} strokeWidth={1.7} /></DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className={cn(menuContent, "w-[240px]")}>
            <DropdownMenuLabel className={menuLabel}>Explore Gravity Pants</DropdownMenuLabel>
            {exploreNav.map((item) => <DropdownMenuItem key={item.to} asChild className={menuItem}><Link to={item.to as "/"}>{item.label}</Link></DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
        <label className="relative hidden lg:block">
          <Search size={15} strokeWidth={1.7} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ap-muted" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search your ads" className="h-9 w-[210px] rounded-lg bg-ap-panel pl-8 pr-3 text-[14px] text-ap-ink placeholder:text-ap-muted focus-visible:outline-none" />
        </label>
        <NewAdButton className={primary} />
        <div className="hidden lg:contents"><HelpMenu /><UserMenu /></div>
      </div>
    </>
  );
}

