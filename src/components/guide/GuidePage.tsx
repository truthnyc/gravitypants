import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSupportDialog } from "@/components/stillframe/HelpMenu";
import { GUIDE_SECTIONS } from "@/lib/stillframe/guide";
import { GuideNavigation } from "./GuideNavigation";
import { GuideSection } from "./GuideSection";

export function GuidePage() {
  const [supportOpen, setSupportOpen] = useState(false);
  return <main className="min-h-dvh bg-ap-card font-ap text-ap-ink"><div className="mx-auto max-w-[1120px] px-5 pb-12 pt-7 sm:px-8 sm:pt-10">
    <Button variant="link" asChild className="mb-4 min-h-11 px-0 text-ap-muted" data-cta="guide-help-center"><Link to="/app/help"><ArrowLeft className="size-4" strokeWidth={1.7} />Help center</Link></Button>
    <header className="max-w-[740px] pb-7 sm:pb-10"><p className="mb-3 text-[13px] font-medium text-ap-blue">Tutorial</p><h1 className="max-w-[680px] text-[32px] font-semibold leading-[1.15] sm:text-[42px]">Getting started with Gravity Pants</h1></header>
    <div className="grid items-start gap-7 lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-14"><GuideNavigation /><article aria-label="Getting started tutorial" className="min-w-0 space-y-10 sm:space-y-12">{GUIDE_SECTIONS.map((section, i) => <GuideSection key={section.id} section={section} number={i + 1} onSupport={() => setSupportOpen(true)} />)}</article></div>
  </div><ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} /></main>;
}
