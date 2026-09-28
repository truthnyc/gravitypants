import { Link } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { cn } from "@/lib/utils";
import { useSearch } from "./search-context";
import { UserMenu } from "./UserMenu";
import { HelpMenu } from "./HelpMenu";
import { TrialPill } from "@/components/billing/BillingNotices";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useState } from "react";

const navItems = [
  { to: "/app/ads", label: "Your Ads" },
  { to: "/app/brand", label: "Brand Kit" },
] as const;

export function AppHeader() {
  const { query, setQuery } = useSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}><Search strokeWidth={1.7} /></Button>
        <div className="lg:hidden"><HelpMenu /></div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" onClick={() => setMenuOpen(true)}><Menu strokeWidth={1.7} /></Button>
      </div>
      <Drawer open={searchOpen} onOpenChange={setSearchOpen} shouldScaleBackground={false}>
        <DrawerContent className="lg:hidden">
          <DrawerHeader><DrawerTitle>Search your ads</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-6"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-icon" strokeWidth={1.7} /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-12 w-full rounded-sm bg-control-fill pl-11 pr-3 text-foreground placeholder:text-secondary-text focus-visible:outline-none" /></label></div>
        </DrawerContent>
      </Drawer>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen} shouldScaleBackground={false}>
        <DrawerContent className="lg:hidden">
          <DrawerHeader><DrawerTitle>Menu</DrawerTitle></DrawerHeader>
          <nav className="grid px-4 pb-3">{navItems.map((item) => <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="flex h-12 items-center hairline-b">{item.label}</Link>)}</nav>
          <div className="flex items-center justify-between px-4 pb-6"><TrialPill /><UserMenu /></div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
