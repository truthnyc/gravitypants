import { Link } from "@tanstack/react-router";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideSectionData } from "@/lib/stillframe/guide";
import { GuideScreenshot } from "./GuideScreenshot";

export function GuideSection({ section, number, onSupport }: { section: GuideSectionData; number: number; onSupport: () => void }) {
  return <section aria-labelledby={section.id} className="border-b border-ap-hairline pb-10 last:border-b-0 sm:pb-12">
    <div className="mb-4 flex flex-wrap items-center gap-3"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-sm bg-ap-soft-blue text-[13px] font-semibold tabular-nums text-ap-blue">{String(number).padStart(2, "0")}</span>
      <h2 id={section.id} tabIndex={-1} className="scroll-mt-[152px] text-[23px] font-semibold leading-tight text-ap-ink outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ap-blue lg:scroll-mt-[100px] sm:text-[26px]">{section.title}</h2>
      {section.comingSoon && <span className="rounded-lg bg-ap-panel px-2.5 py-1 text-[11px] font-medium text-ap-muted">Coming soon</span>}
    </div>
    <ol role="list" className="space-y-3">{section.steps.map((step, i) => <li key={i} className="flex gap-3 text-[15px] leading-[1.7] text-ap-body"><span className="sr-only">Step {i + 1}. </span><span className="w-4 shrink-0 select-none pt-px text-right text-[13px] font-medium tabular-nums text-ap-muted" aria-hidden="true">{i + 1}.</span><span>{step}</span></li>)}</ol>
    <GuideScreenshot section={section} />
    <div className="flex gap-3 border-l-2 border-ap-blue bg-ap-soft-blue px-4 py-3.5"><Lightbulb className="mt-0.5 size-4 shrink-0 text-ap-blue" strokeWidth={1.7} aria-hidden="true" /><p className="text-[14px] leading-relaxed text-ap-body"><strong className="font-semibold text-ap-ink">Tip</strong><span className="mx-1.5" aria-hidden="true">·</span>{section.tip}</p></div>
    {section.link && <Button asChild variant="link" data-cta={`guide-open-${section.id}`} className="mt-3 min-h-11 px-0 text-[14px] text-ap-blue"><Link to={section.link.to}>{section.link.label}<ArrowRight className="size-4" strokeWidth={1.7} /></Link></Button>}
    {section.support && <Button onClick={onSupport} data-cta="guide-contact-support" className="mt-5 min-h-11">Contact support<ArrowRight className="size-4" strokeWidth={1.7} /></Button>}
  </section>;
}
