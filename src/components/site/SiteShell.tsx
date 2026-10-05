import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { FooterNewsletter, NewsletterPopup } from "@/components/site/Newsletter";

type FooterLink = { label: string; to: string; mailto?: boolean; external?: boolean };
const columns: { label: string; links: FooterLink[] }[] = [
  { label: "Product", links: [{ label: "How it works", to: "/how-it-works" }, { label: "Features", to: "/features" }, { label: "Pricing", to: "/pricing" }, { label: "Blog", to: "/blog" }] },
  { label: "Examples", links: [{ label: "Gallery", to: "/examples" }, { label: "Showcase", to: "/showcase" }, { label: "Get a brand reel", to: "/contact" }] },
  { label: "Company", links: [{ label: "About", to: "/about" }, { label: "Contact", to: "mailto:info@gravitypants.com", mailto: true }] },
  { label: "Help", links: [{ label: "Help center", to: "/help" }, { label: "Status", to: "https://status.gravitypants.com", external: true }, { label: "Privacy", to: "/privacy" }, { label: "Terms", to: "/terms" }] },
];

function SiteFooter() {
  return <footer className="mt-auto border-t border-site-line bg-site-page px-5 pb-10 pt-14 text-site-ink md:px-8 lg:px-16 xl:px-24">
    <div className="mx-auto flex max-w-[1248px] flex-col gap-10 lg:flex-row lg:gap-20">
      <div className="max-w-[320px] shrink-0"><GravityPantsLogo size={28} showWordmark /><p className="mt-3 text-[14px] leading-normal text-site-muted">Turn the product photos you already have into short video ads.</p></div>
      <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">{columns.map((column) => <div key={column.label} className="flex flex-col gap-3 text-[14px]"><span className="font-semibold">{column.label}</span>{column.links.map((link) => link.mailto || link.external ? <a key={link.label} href={link.to} {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})} className="text-site-muted hover:text-site-primary">{link.label}</a> : <Link key={link.label} to={link.to as "/"} className="text-site-muted hover:text-site-primary">{link.label}</Link>)}</div>)}</div>
    </div>
    <div className="mx-auto mt-12 max-w-[1248px] border-t border-site-line pt-8"><FooterNewsletter /></div>
    <p className="mx-auto mt-10 max-w-[1248px] text-[13px] text-site-muted">© 2026 Gravity Pants. All rights reserved.</p>
  </footer>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-site-page font-site text-site-ink"><SiteHeader variant="site" /><main className="min-h-[48dvh] flex-1">{children}</main><SiteFooter /><NewsletterPopup /></div>;
}