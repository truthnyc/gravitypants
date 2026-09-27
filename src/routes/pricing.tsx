import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { PlanCards } from "@/components/billing/PlanCards";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Gravity Pants" },
      { name: "description", content: "Simple and Business plans for exporting video ads and GIFs. Every account starts with a 15-day free trial." },
      { property: "og:title", content: "Pricing — Gravity Pants" },
      { property: "og:description", content: "Pick a plan. Every account starts with a 15-day free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <main className="mx-auto max-w-[1040px] px-8 pb-20 pt-10">
      <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg" aria-label="Gravity Pants home">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-foreground">
          <Play size={13} strokeWidth={1.7} className="text-card" fill="currentColor" />
        </span>
        <span className="text-[16px] font-semibold tracking-[-0.01em]">Gravity Pants</span>
      </Link>
      <div className="mx-auto mt-14 max-w-[640px] text-center">
        <h1 className="text-[56px] font-bold leading-[1.05] tracking-[-0.03em]">Pick a plan.</h1>
        <p className="mt-4 text-[19px] text-secondary-text">
          Every account starts with a 15-day free trial to build ads. Exporting videos and GIFs needs a Simple or Business plan.
        </p>
      </div>
      <div className="mt-12">
        <PlanCards />
      </div>
    </main>
  );
}
