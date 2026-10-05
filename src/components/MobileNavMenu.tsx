import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { SHOW_DIRECTORY } from "@/lib/features";
import { useMe, useSignOut } from "@/lib/stillframe/account";
import { planName, useBilling } from "@/lib/stillframe/billing";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/stillframe/UserMenu";
import { WorkspaceList } from "@/components/stillframe/WorkspaceSwitcher";
import { useSearch } from "@/components/stillframe/search-context";

/** The one phone/tablet menu (Option A), opened by ☰ in the shared header on site and app. */

export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
}

type Item = { label: string; to: string; exact?: boolean };
const work: Item[] = [
  { label: "Your Ads", to: "/app/ads", exact: true },
  { label: "Brand Kit", to: "/app/brand" },
  { label: "Previous Exports", to: "/app/exports" },
];
const explore: Item[] = [
  ...(SHOW_DIRECTORY ? [{ label: "Directory", to: "/directory" }] : []),
  { label: "Examples", to: "/examples" },
  { label: "Showcase", to: "/showcase" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
];
const account: Item[] = [
  { label: "Account", to: "/app/account", exact: true },
  { label: "Favorites", to: "/app/account/favorites" },
  { label: "Billing", to: "/app/account/billing" },
  { label: "Help", to: "/help" },
];

const active = (pathname: string, i: Item) => (i.exact ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`));

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-ap-muted">{label}</p>
      {children}
    </div>
  );
}

function Row({ item, pathname, size, onNavigate }: { item: Item; pathname: string; size: "lg" | "md"; onNavigate: () => void }) {
  const on = active(pathname, item);
  return (
    <Link
      to={item.to as "/"}
      onClick={onNavigate}
      aria-current={on ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center rounded-lg px-3 text-ap-ink transition-colors hover:bg-ap-panel",
        size === "lg" ? "text-[17px] font-semibold" : "text-[15px]",
        on && "bg-ap-soft-blue text-ap-blue-strong hover:bg-ap-soft-blue",
      )}
    >
      {item.label}
    </Link>
  );
}

function AccountCard() {
  const { data: me } = useMe();
  const { data: billing } = useBilling();
  const name = me?.displayName || me?.email?.split("@")[0] || "Your account";
  const plan = billing?.plan && billing.plan !== "none" ? planName(billing.plan) : null;
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-ap-panel p-3.5">
      <Avatar me={me} size={40} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ap-ink">{name}</p>
        <p className="truncate text-[13px] text-ap-muted">{[me?.email, plan].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
  );
}

function SearchField({ close }: { close: () => void }) {
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        close();
        void navigate({ to: "/app/ads" });
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ap-muted" strokeWidth={1.7} aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your ads"
        aria-label="Search your ads"
        className="h-[42px] w-full rounded-[12px] bg-ap-panel pl-10 pr-3 text-[16px] text-ap-ink placeholder:text-ap-muted focus-visible:outline-none"
      />
    </form>
  );
}

export function MobileMenu({
  open,
  signedIn,
  pathname,
  close,
}: {
  open: boolean;
  signedIn: boolean;
  pathname: string;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>("input, a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !ref.current) return;
      // Keep focus inside the menu and its toggle button while open.
      const toggle = document.querySelector<HTMLElement>('[aria-controls="mobile-menu"]');
      const items = [
        ...(toggle ? [toggle] : []),
        ...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next]!.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const exploreRows = explore.map((i) => <Row key={i.to} item={i} pathname={pathname} size={signedIn ? "md" : "lg"} onNavigate={close} />);

  return (
    <div
      ref={ref}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="absolute inset-x-0 top-full h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain bg-ap-card px-4 py-4 safe-bottom md:px-7 md:py-5 lg:hidden"
    >
      {signedIn ? (
        <div className="flex flex-col gap-3">
          <SearchField close={close} />
          <WorkspaceList onSwitch={close} />
          <div className="grid gap-x-8 md:grid-cols-2">
            <div className="flex flex-col">
              <Group label="Your work">{work.map((i) => <Row key={i.to} item={i} pathname={pathname} size="lg" onNavigate={close} />)}</Group>
              <div className="md:hidden"><Group label="Explore">{exploreRows}</Group></div>
              <AccountCard />
              <div className="mt-1 flex flex-col">
                {account.map((i) => <Row key={i.to} item={i} pathname={pathname} size="md" onNavigate={close} />)}
                <button type="button" onClick={() => { close(); void signOut(); }} className="flex min-h-12 items-center rounded-lg px-3 text-left text-[15px] text-ap-red hover:bg-ap-panel">
                  Sign out
                </button>
              </div>
            </div>
            <div className="hidden md:block"><Group label="Explore">{exploreRows}</Group></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <Group label="Explore">{exploreRows}</Group>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link to="/signup" onClick={close} className="flex h-12 items-center justify-center rounded-lg bg-ap-blue text-[16px] font-medium text-ap-card hover:bg-ap-blue-hover">Start free</Link>
            <Link to="/signin" onClick={close} className="flex h-12 items-center justify-center rounded-lg bg-ap-panel text-[16px] font-medium text-ap-ink hover:bg-ap-hairline">Sign in</Link>
          </div>
        </div>
      )}
    </div>
  );
}
