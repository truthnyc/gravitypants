import { createFileRoute, Link } from "@tanstack/react-router";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
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
    <main className="mx-auto max-w-[1040px] px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
      <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg" aria-label="Gravity Pants home">
        <GravityPantsLogo size={26} showWordmark />
      </Link>
      <div className="mx-auto mt-10 max-w-[640px] text-center sm:mt-14">
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">Pick a plan.</h1>
        <p className="mt-4 text-[17px] text-secondary-text sm:text-[19px]">
          Every account starts with a 15-day free trial to build ads. Exporting videos and GIFs needs a Simple or Business plan.
        </p>
      </div>
      <div className="mt-12">
        <PlanCards />
      </div>
    </main>
  );
}
