import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PlanCards } from "@/components/billing/PlanCards";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Gravity Pants" },
      { name: "description", content: "Simple, Business and Team plans for exporting video ads and GIFs. Every account starts with a 7-day free trial." },
      { property: "og:title", content: "Pricing — Gravity Pants" },
      { property: "og:description", content: "Pick a plan. Every account starts with a 7-day free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <SiteShell>
    <main className="mx-auto max-w-[1040px] px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
      <div className="mx-auto mt-10 max-w-[640px] text-center sm:mt-14">
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">Pick a plan.</h1>
        <p className="mt-4 text-[17px] text-secondary-text sm:text-[19px]">
          Start free: 7 days and 3 exports with a small Gravity Pants mark. Pick a plan for clean exports without it.
        </p>
      </div>
      <div className="mt-12">
        <PlanCards />
      </div>
    </main>
    </SiteShell>
  );
}
