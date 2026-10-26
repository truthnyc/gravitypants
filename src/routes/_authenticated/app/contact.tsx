import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { AppButton } from "@/components/app-ui";
import { ContactSupportDialog } from "@/components/stillframe/HelpMenu";

export const Route = createFileRoute("/_authenticated/app/contact")({
  head: () => ({
    meta: [
      { title: "Contact Gravity Pants" },
      { name: "description", content: "Send the Gravity Pants team a message about your account, brand page or reels." },
      { property: "og:title", content: "Contact Gravity Pants" },
      { property: "og:description", content: "Send the Gravity Pants team a message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="acct mx-auto flex w-full max-w-[780px] flex-col gap-4 px-4 pb-20 pt-9 sm:px-6">
      <h1 className="acct-h1">Contact Gravity Pants</h1>
      <section className="acct-card">
        <h2 className="text-[20px] font-semibold">Send us a message</h2>
        <p className="mt-1 text-[14px] leading-[1.5] text-ap-body">Ask about your brand page, your reels or your account. We reply by email.</p>
        <AppButton className="mt-4" data-cta="contact-send-message" onClick={() => setOpen(true)}>Write a message</AppButton>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-ap-body">
          <Mail className="size-4" strokeWidth={1.7} /> Or email <a href="mailto:help@gravitypants.com" data-cta="contact-email" className="text-ap-blue">help@gravitypants.com</a>
        </p>
      </section>
      <ContactSupportDialog open={open} onOpenChange={setOpen} />
    </main>
  );
}
