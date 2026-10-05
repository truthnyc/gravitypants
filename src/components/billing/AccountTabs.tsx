import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/lib/stillframe/plan";

const tabs = [
  { to: "/app/account", label: "Profile" },
  { to: "/app/account/billing", label: "Billing" },
  { to: "/app/account/directory", label: "Directory" },
  { to: "/app/account/favorites", label: "Favorites" },
  { to: "/app/account/members", label: "Team" },
] as const;

export function AccountTabs() {
  const { data: access } = usePlanAccess();
  return (
    <nav className="mb-2 flex gap-[3px] rounded-[10px] bg-ap-inner p-[3px] font-ap" aria-label="Account sections">
      {tabs.filter((t) => t.label !== "Team" || access?.team).map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[7px] px-2.5 py-2 text-[14px] text-ap-body transition-colors",
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
