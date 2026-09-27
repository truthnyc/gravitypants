import { Link } from "@tanstack/react-router";
import { Play, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "./search-context";
import { UserMenu } from "./UserMenu";
import { TrialPill } from "@/components/billing/BillingNotices";

const navItems = [
  { to: "/", label: "Your Ads" },
  { to: "/brand", label: "Brand Kit" },
] as const;

export function AppHeader() {
  const { query, setQuery } = useSearch();

  return (
    <header className="sticky top-0 z-30 h-[60px] bg-card/90 backdrop-blur-xl hairline-b">
      <div className="mx-auto flex h-full items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Stillframe home">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-foreground">
            <Play size={13} strokeWidth={1.7} className="text-card" fill="currentColor" />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.01em]">Stillframe</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-foreground transition-colors hover:bg-control-fill/60"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-control-fill hover:bg-control-fill" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto relative">
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
        <TrialPill />
        <UserMenu />
      </div>
    </header>
  );
}
