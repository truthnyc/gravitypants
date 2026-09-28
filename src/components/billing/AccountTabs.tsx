import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/lib/stillframe/plan";

const tabs = [
  { to: "/app/account", label: "Profile" },
  { to: "/app/account/billing", label: "Billing" },
  { to: "/app/account/members", label: "Team" },
] as const;

export function AccountTabs() {
  const { data: access } = usePlanAccess();
  return (
    <nav className="flex gap-1 rounded-lg bg-control-fill p-1" aria-label="Account sections">
      {tabs.filter((t) => t.label !== "Team" || access?.team).map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={cn(
            "flex h-8 flex-1 items-center justify-center rounded-md px-3 text-[13px] font-medium text-secondary-text transition-colors",
          )}
          activeProps={{ className: "bg-card text-foreground shadow-sm" }}
          activeOptions={{ exact: true }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
