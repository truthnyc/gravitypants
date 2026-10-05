import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { cn } from "@/lib/utils";
import { useSearch } from "./search-context";
import { UserMenu } from "./UserMenu";
import { HelpMenu } from "./HelpMenu";
import { TrialPill } from "@/components/billing/BillingNotices";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { WorkspaceSwitcher, WorkspaceList } from "./WorkspaceSwitcher";
import { MobileNavLink, MobileNavPanel, useBodyScrollLock } from "@/components/MobileNavMenu";

const navItems = [
  { to: "/app/ads", label: "Your Ads" },
  { to: "/app/brand", label: "Brand Kit" },
  { to: "/app/exports", label: "Previous Exports" },
] as const;

export function AppHeader() {
  const { query, setQuery } = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useBodyScrollLock(menuOpen);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl hairline-b safe-top">
      <div className="mx-auto flex h-[60px] items-center gap-6 px-4 sm:px-6">
        <Link to="/app/ads" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Gravity Pants home">
          <GravityPantsLogo size={26} showWordmark />
        </Link>

        <div className="hidden min-w-0 sm:block">
          <WorkspaceSwitcher />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-foreground transition-colors hover:bg-control-fill/60"
              activeOptions={{ exact: item.to === "/app/ads" }}
              activeProps={{ className: "bg-control-fill hover:bg-control-fill" }}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/" className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-secondary-text transition-colors hover:bg-control-fill/60">Website</Link>
        </nav>

        <div className="relative ml-auto hidden lg:block">
          <Search
            size={15}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-icon"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search your ads"
            className={cn(
              "h-[34px] w-[240px] rounded-lg bg-control-fill pl-8 pr-3 text-[14px] text-foreground",
              "placeholder:text-secondary-text focus-visible:outline-none",
            )}
          />
        </div>
        <div className="hidden lg:contents"><TrialPill /><HelpMenu /><UserMenu /></div>
        <div className="ml-auto lg:hidden"><HelpMenu /></div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
        </Button>
      </div>

      <MobileNavPanel open={menuOpen} topClass="top-[60px]" heightClass="h-[calc(100dvh-60px)]" className="bg-card">
        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-icon" strokeWidth={1.7} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your ads"
            aria-label="Search your ads"
            className="h-12 w-full rounded-lg bg-control-fill pl-11 pr-3 text-[16px] text-foreground placeholder:text-secondary-text focus-visible:outline-none"
          />
        </label>
        {navItems.map((item) => (
          <MobileNavLink
            key={item.to}
            to={item.to}
            onNavigate={close}
            active={item.to === "/app/ads" ? pathname === "/app/ads" : pathname.startsWith(item.to)}
          >
            {item.label}
          </MobileNavLink>
        ))}
        <MobileNavLink to="/" onNavigate={close}>Website</MobileNavLink>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
          <WorkspaceList onSwitch={close} />
          <div className="flex items-center justify-between">
            <TrialPill />
            <UserMenu />
          </div>
        </div>
      </MobileNavPanel>
    </header>
  );
}
