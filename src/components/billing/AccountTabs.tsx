import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/account", label: "Profile" },
  { to: "/account/billing", label: "Billing" },
  { to: "/account/members", label: "Team" },
] as const;

export function AccountTabs() {
  return (
    <nav className="flex gap-1 rounded-lg bg-control-fill p-1" aria-label="Account sections">
      {tabs.map((t) => (
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
