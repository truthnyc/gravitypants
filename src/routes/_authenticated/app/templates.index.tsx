import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { TemplatePreview, templateFormat, templateSlides, usePrefersReducedMotion } from "@/components/templates/TemplatePreview";
import { useTemplateAccess, useTemplates, type Template } from "@/lib/stillframe/data";
import { templateForExample } from "@/lib/site/example-template";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/templates/")({
  validateSearch: z.object({ template: z.string().optional(), tab: z.enum(["system", "mine", "team"]).optional() }),
  head: () => ({
    meta: [
      { title: "Pick a template — Gravity Pants" },
      { name: "description", content: "Choose a starting look for your next ad: ready-made Gravity Pants templates, your own, or your team's." },
      { property: "og:title", content: "Pick a template — Gravity Pants" },
      { property: "og:description", content: "Choose a starting look for your next video ad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplatesPage,
});

export const templateSlug = (t: Template) => t.slug ?? t.id;

type Tab = "system" | "mine" | "team";
const EMPTY = "Templates you save will appear here. Open an ad → ••• → Save as Template.";

export function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      <span className="nums text-[13px] font-medium text-secondary-text">Step {step} of 2</span>
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2].map((n) => <span key={n} className={cn("h-1 w-8 rounded-lg", n <= step ? "bg-primary" : "bg-control-fill")} />)}
      </div>
    </div>
  );
}

function TemplatesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: access } = useTemplateAccess();
  const { data: templates = [], isLoading } = useTemplates();
  const [tab, setTab] = useState<Tab>(search.tab ?? "system");
  const example = search.template ? templateForExample(search.template) : null;

  // A system template slug from the website goes straight to that template.
  useEffect(() => {
    if (!search.template || isLoading) return;
    const hit = templates.find((t) => t.slug === search.template || t.id === search.template);
    if (hit) void navigate({ to: "/app/templates/$slug", params: { slug: templateSlug(hit) }, replace: true });
  }, [search.template, isLoading, templates, navigate]);

  const system = templates.filter((t) => t.source === "system" || t.visibility === "global");
  const own = templates.filter((t) => t.source !== "system" && t.visibility !== "global");
  const mine = own.filter((t) => t.created_by === access?.userId);
  const team = own.filter((t) => t.visibility === "team" && t.created_by !== access?.userId);
  const tabs: [Tab, string][] = [["system", "Gravity Pants"], ["mine", "My templates"], ...(access?.team ? [["team", "Team templates"] as [Tab, string]] : [])];
  const list = tab === "system" ? system : tab === "mine" ? mine : team;

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div className="flex items-center justify-between gap-4">
        <Link to="/app/ads" className="-ml-1 inline-flex h-11 items-center gap-0.5 text-[14px] font-medium text-link focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
          <ChevronLeft className="size-4" strokeWidth={1.7} /> Back
        </Link>
        <StepBar step={1} />
      </div>
      <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.02em] sm:text-[40px]">Pick a cut.</h1>
      <p className="mt-2 max-w-[560px] text-[16px] text-secondary-text">
        Each template sets the pace, transitions and text for your ad. Pick one, add your photos, then change anything you like.
      </p>

      {example && (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold">From the gallery</h2>
          <div className="mt-3 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <TemplateCard template={{ ...example, slug: `example-${search.template}`, description: "The style you picked on the website.", is_reusable: false }} selected />
          </div>
        </section>
      )}

      <div role="tablist" aria-label="Template collections" className="mt-8 flex max-w-full gap-1 overflow-x-auto rounded-lg bg-control-fill p-0.5 sm:inline-flex">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("h-11 shrink-0 whitespace-nowrap rounded-lg px-4 text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-primary lg:h-9", tab === id ? "bg-card shadow-segment" : "text-secondary-text")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-[13px] text-secondary-text">Loading…</p>
        ) : list.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-placeholder-border p-8 text-center">
            <p className="mx-auto max-w-[420px] text-[14px] text-secondary-text">{EMPTY}</p>
            <Link to="/app/ads" className="mt-4 inline-flex h-11 items-center rounded-lg bg-control-fill px-4 text-[14px] font-medium lg:h-9">Go to your ads</Link>
          </div>
        )}
      </div>
    </main>
  );
}

function TemplateCard({ template: t, selected = false }: { template: Template; selected?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const slides = templateSlides(t);
  return (
    <Link
      to="/app/templates/$slug"
      params={{ slug: templateSlug(t) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        "group block rounded-sm bg-card p-3 shadow-card outline-none transition-[transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 hover:shadow-popover",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="flex h-[196px] items-center justify-center rounded-sm bg-[var(--site-panel,#F5F5F7)] p-4">
        <TemplatePreview template={t} playing={hover && !reduced} />
      </div>
      <div className="px-1 pb-1 pt-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-[16px] font-semibold">{t.name}</h3>
          {t.is_reusable && <span className="shrink-0 rounded-lg bg-control-fill px-2 py-0.5 text-[12px] font-medium">Reusable</span>}
        </div>
        <p className="nums mt-0.5 text-[13px] text-secondary-text">{templateFormat(t)} · {slides.length} {slides.length === 1 ? "slide" : "slides"}</p>
        {t.description && <p className="mt-1.5 text-[14px] text-secondary-text">{t.description}</p>}
      </div>
    </Link>
  );
}
