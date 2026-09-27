import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FileClock, LayoutDashboard, ShieldCheck, Users, Video } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/exports", label: "Exports", icon: Video },
  { to: "/admin/admins", label: "Admins", icon: ShieldCheck },
  { to: "/admin/audit", label: "Audit Log", icon: FileClock },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] gap-8 px-8 py-8">
      <nav aria-label="Admin" className="w-[200px] shrink-0">
        <div className="mb-3 px-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-secondary-text">Admin</div>
        <ul className="space-y-0.5">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                activeOptions={{ exact: "exact" in n }}
                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[14px] text-foreground hover:bg-control-fill data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:shadow-card"
              >
                <n.icon className="size-4" strokeWidth={1.7} />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string | undefined; right?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-secondary-text">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-sm bg-card p-5 shadow-card ${className}`}>{children}</section>;
}

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;
export const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const PLAN_LABEL: Record<string, string> = { trial: "Trial", none: "No plan", simple: "Simple", business: "Business", business_yearly: "Business Yearly" };
export const planLabel = (p: string) => PLAN_LABEL[p] ?? p;
const STATUS_LABEL: Record<string, string> = { trialing: "Trial", active: "Active", past_due: "Payment problem", canceled: "Canceled", suspended: "Paused", none: "—" };
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "bad" | "accent" }) {
  const cls = {
    plain: "bg-control-fill text-foreground",
    good: "bg-success-soft text-success-text",
    bad: "bg-destructive/10 text-destructive",
    accent: "bg-primary/10 text-primary",
  }[tone];
  return <span className={`inline-flex h-6 items-center rounded-lg px-2 text-[12px] font-medium ${cls}`}>{children}</span>;
}

export const statusTone = (s: string): "plain" | "good" | "bad" | "accent" =>
  s === "active" ? "good" : s === "past_due" || s === "suspended" ? "bad" : s === "trialing" ? "accent" : "plain";
