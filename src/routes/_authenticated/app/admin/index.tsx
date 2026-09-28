import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, fmtDate, fmtMoney, PageTitle } from "@/components/admin/AdminShell";
import { adminOverview } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  head: () => ({ meta: [
    { title: "Admin Overview — Gravity Pants" },
    { name: "description", content: "Private overview of Gravity Pants clients and activity." },
    { property: "og:title", content: "Admin Overview — Gravity Pants" },
    { property: "og:description", content: "Private overview of Gravity Pants clients and activity." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Overview,
});

function Overview() {
  const fn = useServerFn(adminOverview);
  const { data, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn() });
  if (error) return <p className="text-destructive">Couldn't load the overview.</p>;
  if (!data) return <div aria-busy="true" className="h-96" />;
  const stats = [
    ["New sign-ups (7 days)", data.signups7],
    ["Active trials", data.activeTrials],
    ["Paying clients", data.paying],
    ["Monthly recurring revenue", fmtMoney(data.mrrCents)],
    ["Exports this month", data.exportsMonth],
    ["Trials ending in 3 days", data.trialsEnding3],
  ] as const;
  return (
    <>
      <PageTitle title="Overview" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, v]) => (
          <Card key={label}>
            <div className="text-[13px] text-secondary-text">{label}</div>
            <div className="mt-1 text-[30px] font-bold nums tracking-[-0.02em]">{v}</div>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="mb-3 text-[15px] font-semibold">Last 30 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.days}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={12} stroke="var(--secondary-text)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--secondary-text)" width={32} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="signups" name="Sign-ups" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="exports" name="Exports" stroke="var(--foreground)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientList title="Trials ending soon" rows={data.trialsEnding.map((c) => ({ id: c.id, name: c.name, email: c.ownerEmail, right: `Ends ${fmtDate(c.trialEndsAt)}` }))} />
        <ClientList title="Payment problems" rows={data.paymentProblems.map((c) => ({ id: c.id, name: c.name, email: c.ownerEmail, right: "Payment problem" }))} />
      </div>
    </>
  );
}

function ClientList({ title, rows }: { title: string; rows: { id: string; name: string; email: string; right: string }[] }) {
  return (
    <Card>
      <h2 className="mb-2 text-[15px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[14px] text-secondary-text">None right now.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to="/app/admin/clients/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{r.name}</span>
                  <span className="block truncate text-[13px] text-secondary-text">{r.email}</span>
                </span>
                <span className="shrink-0 text-[13px] text-secondary-text nums">{r.right}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
