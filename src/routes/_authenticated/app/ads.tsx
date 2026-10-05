import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AdCard } from "@/components/stillframe/AdCard";
import { useDirectoryStatuses } from "@/lib/directory/hooks";
import { DropZone } from "@/components/stillframe/DropZone";
import { useSearch } from "@/components/stillframe/search-context";
import { useProjects, useTemplates } from "@/lib/stillframe/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rememberSignupChoice } from "@/lib/stillframe/signup-choice";
import { PLANS } from "@/lib/stillframe/plans-config";
import { useExportStatus } from "@/lib/stillframe/billing";
import { Check, X } from "lucide-react";

// Shown once after signup: presents the usage-based trial (no clock) as something the user just unlocked.
function TrialUnlocked({ onClose }: { onClose: () => void }) {
  const { data: s } = useExportStatus();
  const total = s?.trial ? (s.limit ?? 3) : 3;
  const left = s?.trial && s.limit != null ? Math.max(0, s.limit - (s.used ?? 0)) : total;
  return (
    <section role="status" className="relative mb-5 rounded-sm bg-card px-5 py-5 shadow-card">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-secondary-text">
        <X size={18} strokeWidth={1.7} />
      </button>
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-link">Free trial unlocked</p>
      <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">You've earned <span className="tabular-nums">{left}</span> free exports</h2>
      <ul className="mt-3 grid gap-1.5 text-[15px] text-secondary-text sm:grid-cols-3">
        <li className="flex items-center gap-2"><Check size={16} strokeWidth={1.7} className="text-link" />First export with no watermark</li>
        <li className="flex items-center gap-2"><Check size={16} strokeWidth={1.7} className="text-link" />Every format and feature</li>
        <li className="flex items-center gap-2"><Check size={16} strokeWidth={1.7} className="text-link" />No time limit, no card</li>
      </ul>
      <p className="mt-3 text-[15px] font-medium">Drop in your first photos to start.</p>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/app/ads")({
  validateSearch: z.object({ welcome: z.coerce.string().optional(), template: z.coerce.string().optional(), plan: z.coerce.string().optional(), billing: z.coerce.string().optional() }),
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YourAds,
});

function YourAds() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    const first = search.welcome === "1" || sessionStorage.getItem("gravity-pants:welcome") === "1";
    if (first) { setWelcome(true); sessionStorage.removeItem("gravity-pants:welcome"); }
    if (search.template) {
      // Website "Use this style" lands on the template picker with that style preselected.
      sessionStorage.removeItem("gravity-pants:example");
      void navigate({ to: "/app/templates", search: { template: search.template }, replace: true });
      return;
    }
    const pending = sessionStorage.getItem("gravity-pants:pending-plan");
    if (pending || search.plan) void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      try {
        const choice = search.plan ? { plan: search.plan, billing: search.billing } : JSON.parse(pending ?? "null");
        const p = PLANS.find((item) => item.id === choice?.plan);
        if (p && (choice.billing === "monthly" || (choice.billing === "yearly" && p.yearly !== null))) rememberSignupChoice(data.user.id, choice);
      } catch { /* Ignore malformed saved intent. */ }
      sessionStorage.removeItem("gravity-pants:pending-plan");
    });
    if (search.welcome || search.template || search.plan || search.billing) void navigate({ to: "/app/ads", search: {}, replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { query } = useSearch();
  const { data: projects, isLoading } = useProjects();
  const dir = useDirectoryStatuses();

  const term = query.trim().toLowerCase();
  const { data: templates = [] } = useTemplates();
  const kitName = (id: string | null | undefined) => (id && templates.find((t) => t.id === id && t.is_reusable)?.name.toLowerCase()) || "";
  const visible = (projects ?? []).filter((project) =>
    term ? project.name.toLowerCase().includes(term) || kitName(project.template_id).includes(term) : true,
  );
  const isEmpty = !isLoading && (projects ?? []).length === 0;

  return (
    <main className="px-4 py-7 sm:px-8 sm:py-10 lg:px-16">
      {welcome && <TrialUnlocked onClose={() => setWelcome(false)} />}
      <div className="mb-6 flex items-end justify-between lg:mb-4 lg:justify-end">
        <h1 className="text-[36px] font-bold leading-none lg:hidden">Your ads</h1>
        <Link to="/app/templates" className="flex h-11 items-center text-[14px] font-medium text-link">Templates</Link>
      </div>
      <div className={isEmpty ? "mx-auto max-w-[860px] py-4 lg:py-16" : ""}>
        <DropZone spacious={isEmpty} />
      </div>

      {!isEmpty && (
        <section className="mt-12">
          <h1 className="hidden text-[22px] font-bold tracking-[-0.02em] lg:block">Your ads</h1>

          {isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-[252px] animate-pulse rounded-sm bg-card shadow-card" />
              ))}
            </div>
          ) : visible.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {visible.map((project) => (
                <AdCard key={project.id} project={project} dirStatus={dir.statuses[project.id]} liveUntil={dir.liveUntil} onHide={() => void dir.hide(project.id)} />
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
