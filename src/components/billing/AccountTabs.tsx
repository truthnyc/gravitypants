import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/lib/stillframe/plan";
import { SHOW_SHARE } from "@/lib/features";

const tabs = [
  { to: "/app/account", label: "Profile" },
  { to: "/app/account/billing", label: "Billing" },
  { to: "/app/account/directory", label: "Published reels" },
  { to: "/app/account/favorites", label: "Favorites" },
  { to: "/app/account/stats", label: "Stats" },
  { to: "/app/account/members", label: "Team" },
] as const;

export function AccountTabs() {
  const { data: access, canUse } = usePlanAccess();
  const statsOk = !!access && canUse("brand_stats");
  return (
    <nav className="mb-2 flex w-full min-w-0 self-stretch gap-[3px] rounded-lg bg-ap-inner p-[3px] font-ap" aria-label="Account sections">
      {tabs.filter((t) => (t.label !== "Team" || access?.team) && (t.label !== "Published reels" || SHOW_SHARE) && (t.label !== "Stats" || statsOk)).map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-lg px-1.5 py-2 text-center text-[13px] leading-5 text-ap-body transition-colors sm:px-2.5 sm:text-[14px]",
          )}
          activeProps={{ className: "bg-ap-card font-semibold !text-ap-ink shadow-[var(--ap-shadow-soft)]" }}
          activeOptions={{ exact: true }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
