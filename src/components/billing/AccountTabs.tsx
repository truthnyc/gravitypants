import { Link } from "@tanstack/react-router";

export function AccountTabs() {
  const cls = "rounded-lg px-3 py-1.5 text-[14px] font-medium hover:bg-control-fill/60";
  return (
    <nav className="flex gap-1" aria-label="Account sections">
      <Link to="/account" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "bg-control-fill" }}>
        Profile
      </Link>
      <Link to="/account/billing" className={cls} activeProps={{ className: "bg-control-fill" }}>
        Billing
      </Link>
    </nav>
  );
}
