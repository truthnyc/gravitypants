import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSupportDialog } from "@/components/stillframe/HelpMenu";
import { HELP_FAQ } from "@/lib/stillframe/guide";

export const Route = createFileRoute("/_authenticated/app/help")({
  head: () => ({
    meta: [
      { title: "Help — Gravity Pants" },
      { name: "description", content: "Answers to common questions about making video ads and GIFs with Gravity Pants." },
      { property: "og:title", content: "Help — Gravity Pants" },
      { property: "og:description", content: "Answers to common questions and a way to reach support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Help</h1>
      <div className="mt-6 flex items-start gap-4 rounded-sm border border-ap-hairline bg-ap-card p-5">
        <BookOpen className="mt-1 size-5 shrink-0 text-ap-blue" strokeWidth={1.7} aria-hidden="true" />
        <div className="min-w-0"><h2 className="text-[17px] font-semibold text-ap-ink">New here? Follow the tutorial</h2>
          <Button asChild variant="link" className="mt-1 min-h-11 whitespace-normal px-0 text-left text-ap-blue" data-cta="help-open-tutorial"><Link to="/app/guide">Getting started with Gravity Pants<ArrowRight className="size-4 shrink-0" strokeWidth={1.7} /></Link></Button>
        </div>
      </div>
      <div className="mt-6 divide-y divide-border rounded-sm bg-card shadow-card">
        {HELP_FAQ.map(([q, a]) => (
          <section key={q} className="p-5">
            <h2 className="text-[15px] font-semibold">{q}</h2>
            <p className="mt-1 text-[14px] text-secondary-text">{a}</p>
          </section>
        ))}
      </div>
      <div className="mt-6 rounded-sm bg-card p-5 shadow-card">
        <h2 className="text-[15px] font-semibold">Still stuck?</h2>
        <p className="mt-1 text-[14px] text-secondary-text">Send us a message and we'll get back to you.</p>
        <Button className="mt-4 h-11 lg:h-9" onClick={() => setOpen(true)}>Contact support</Button>
      </div>
      <ContactSupportDialog open={open} onOpenChange={setOpen} />
    </main>
  );
}
