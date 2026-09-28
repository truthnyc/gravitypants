import { Lock, Pause, Play } from "lucide-react";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { StepBar, TemplatePreview, templateFormat, templateSlug, templateSlides, usePrefersReducedMotion } from "@/components/templates/TemplatePreview";
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

type Tab = "system" | "mine" | "team";
const EMPTY = "Templates you save will appear here. Open an ad → ••• → Save as Template.";

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
      <Link to="/app/ads" className="-ml-1 inline-flex h-11 items-center gap-0.5 text-[14px] text-link focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
        <ChevronLeft className="size-4" strokeWidth={1.7} /> Back
      </Link>
      <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.02em] sm:text-[40px]">Pick a cut.</h1>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[520px] text-[15px] leading-relaxed text-secondary-text">
          Each template comes pre-timed with matched transitions and type. The Product Launch Kit is designed to reuse across your whole catalog.
        </p>
        <StepBar step={1} />
      </div>

      {example && (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold">From the gallery</h2>
          <div className="mt-3 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <TemplateCard template={{ ...example, slug: `example-${search.template}`, description: "The style you picked on the website.", is_reusable: false }} selected />
          </div>
        </section>
      )}

      <div role="tablist" aria-label="Template collections" className="-mx-4 mt-8 flex max-w-[100vw] gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:inline-flex md:max-w-full md:gap-1 md:rounded-lg md:bg-control-fill md:p-0.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-primary md:rounded-lg md:text-[14px] lg:h-9", tab === id ? "bg-foreground text-background md:bg-card md:text-foreground md:shadow-segment" : "bg-control-fill text-secondary-text md:bg-transparent")}
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
  const plan = usePlanAccess();
  const [hover, setHover] = useState(false);
  const [tapPlay, setTapPlay] = useState(false);
  // Hover previews only with a real pointer; phones use the play button instead.
  const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (min-width: 768px)").matches;
  const slides = templateSlides(t);
  const locked = t.source === "system" && !plan.canUseTemplate(t.audience);
  const isNew = Boolean(t.new_until && new Date(t.new_until) > new Date());
  return (
    <div className="relative">
    <Link
      to="/app/templates/$slug"
      params={{ slug: templateSlug(t) }}
      onClick={(e) => { if (locked) { e.preventDefault(); openUpgrade("templates"); } }}
      onMouseEnter={() => canHover && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => canHover && setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-sm bg-card shadow-card outline-none transition-[transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:motion-safe:hover:-translate-y-0.5 md:hover:shadow-popover",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="relative flex h-[196px] items-center justify-center bg-site-panel p-4">
        <TemplatePreview template={t} playing={(hover && !reduced) || tapPlay} quiet className="shadow-popover" />
        {isNew && <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">New</span>}
        {locked && <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-card/95 shadow-card" aria-label="Upgrade to use"><Lock className="size-3.5" strokeWidth={1.7} /></span>}
      </div>
      <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[16px] font-semibold">{t.name}</h3>
          {t.is_reusable && <span className="shrink-0 rounded-lg bg-control-fill px-2 py-0.5 text-[11px] font-semibold text-secondary-text">Reusable</span>}
        </div>
        <p className="nums text-[12px] text-secondary-text">{templateFormat(t)} · {slides.length} {slides.length === 1 ? "slide" : "slides"}{locked ? ` · ${audienceText(t.audience)}` : ""}</p>
        {t.description && <p className="text-[13px] leading-snug">{t.description}</p>}
      </div>
    </Link>
    <button
      type="button"
      onClick={() => setTapPlay((p) => !p)}
      aria-label={tapPlay ? `Pause ${t.name} preview` : `Play ${t.name} preview`}
      className="absolute top-[144px] right-3 flex size-11 items-center justify-center rounded-full bg-card/95 shadow-card md:hidden"
    >
      {tapPlay ? <Pause className="size-4" strokeWidth={1.7} /> : <Play className="size-4" strokeWidth={1.7} />}
    </button>
    </div>
  );
}

const PLAN_NAMES: Record<string, string> = { simple: "Simple", business: "Business", team: "Team" };
const audienceText = (a: string[] | undefined) => `${(a ?? []).map((x) => PLAN_NAMES[x] ?? x).join(", ")} plans`;
