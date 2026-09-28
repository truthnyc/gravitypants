import { createFileRoute, Link } from "@tanstack/react-router";
import { AdCard } from "@/components/stillframe/AdCard";
import { DropZone } from "@/components/stillframe/DropZone";
import { useSearch } from "@/components/stillframe/search-context";
import { useProjects } from "@/lib/stillframe/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rememberSignupChoice } from "@/lib/stillframe/signup-choice";
import { PLANS } from "@/lib/stillframe/plans-config";

export const Route = createFileRoute("/_authenticated/app/ads")({
  head: () => ({
    meta: [
      { title: "Your Ads — Gravity Pants" },
      {
        name: "description",
        content:
          "Turn still photos into short video ads and animated GIFs for social channels. Drop photos, get an ad.",
      },
      { property: "og:title", content: "Your Ads — Gravity Pants" },
      {
        property: "og:description",
        content: "Turn still photos into short video ads and animated GIFs for social channels.",
      },
    ],
  }),
  component: YourAds,
});

function YourAds() {
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    const first = sessionStorage.getItem("gravity-pants:welcome") === "1";
    if (first) { setWelcome(true); sessionStorage.removeItem("gravity-pants:welcome"); }
    const pending = sessionStorage.getItem("gravity-pants:pending-plan");
    if (pending) void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      try {
        const choice = JSON.parse(pending);
        const p = PLANS.find((item) => item.id === choice?.plan);
        if (p && (choice.billing === "monthly" || (choice.billing === "yearly" && p.yearly !== null))) rememberSignupChoice(data.user.id, choice);
      } catch { /* Ignore malformed saved intent. */ }
      sessionStorage.removeItem("gravity-pants:pending-plan");
    });
  }, []);
  const { query } = useSearch();
  const { data: projects, isLoading } = useProjects();

  const term = query.trim().toLowerCase();
  const visible = (projects ?? []).filter((project) =>
    term ? project.name.toLowerCase().includes(term) : true,
  );
  const isEmpty = !isLoading && (projects ?? []).length === 0;

  return (
    <main className="px-4 py-7 sm:px-8 sm:py-10 lg:px-16">
      {welcome && <p role="status" className="mb-5 rounded-sm bg-card px-5 py-4 text-[16px] font-medium">Welcome to Gravity Pants. Drop in your first photos.</p>}
      <div className="mb-6 flex items-end justify-between lg:mb-4 lg:justify-end">
        <h1 className="text-[36px] font-bold leading-none lg:hidden">Your ads</h1>
        <Link to="/app/templates" className="flex h-11 items-center text-[14px] font-medium text-link">Templates</Link>
      </div>
      <div className={isEmpty ? "mx-auto max-w-[860px] py-4 lg:py-16" : ""}>
        <DropZone spacious={isEmpty} />
      </div>

      {!isEmpty && (
        <section className="mt-12">
          <h2 className="hidden text-[22px] font-bold tracking-[-0.02em] lg:block">Your ads</h2>

          {isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-[252px] animate-pulse rounded-sm bg-card shadow-card" />
              ))}
            </div>
          ) : visible.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {visible.map((project) => (
                <AdCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[14px] text-secondary-text">
              No ads match “{query.trim()}”.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
