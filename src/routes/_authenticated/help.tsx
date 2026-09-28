import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ContactSupportDialog } from "@/components/stillframe/HelpMenu";

export const Route = createFileRoute("/_authenticated/help")({
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

const FAQ = [
  ["How do I make an ad?", "On Your Ads, choose your photos. Add text and your logo in the editor, then press Export."],
  ["What does the free trial include?", "7 days and 3 exports, with a small Gravity Pants mark on each file."],
  ["How long are my files kept?", "Finished exports stay under Previous exports for 30 days."],
  ["How do I change or cancel my plan?", "Go to Account › Billing and press Manage Billing."],
  ["Can I share with my team?", "On the Team plan, up to 3 people share brand kits, templates and 150 exports a month."],
] as const;

function HelpPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Help</h1>
      <div className="mt-6 divide-y divide-border rounded-sm bg-card shadow-card">
        {FAQ.map(([q, a]) => (
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
