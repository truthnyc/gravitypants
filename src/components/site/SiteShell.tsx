import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FooterNewsletter, NewsletterPopup } from "@/components/site/Newsletter";
import { UserMenu } from "@/components/stillframe/UserMenu";

const nav = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Examples", to: "/examples" },
  { label: "Showcase", to: "/showcase" },
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
] as const;

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const action = signedIn ? { to: "/app/ads" as const, label: "Open app" } : { to: "/signup" as const, label: "Start free" };
  return (
    <header className="site-header relative z-50 border-b border-site-line bg-site-page/90 safe-top">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-5 md:h-[72px] md:gap-5 md:px-8 lg:gap-8 lg:px-16 xl:px-24">
        <Link to="/" onClick={() => setMenuOpen(false)} className="min-w-0 shrink-0 justify-self-start text-site-ink [&>span>span]:max-[420px]:hidden" aria-label="Gravity Pants home">
          <GravityPantsLogo size={26} showWordmark wordmarkSize={24} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-4 whitespace-nowrap text-[15px] font-medium text-site-nav lg:flex lg:gap-8">
          {nav.map((item) => <Link key={item.label} to={item.to} className="hover:text-site-primary">{item.label}</Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 md:ml-auto md:gap-3">
          {!signedIn && <Link to="/signin" className="hidden px-3 text-[15px] font-medium text-site-ink md:inline-flex">Sign in</Link>}
          <Button asChild variant="site" size="siteHeader" className={signedIn ? "hidden lg:inline-flex" : undefined}><Link to={action.to} onClick={() => setMenuOpen(false)}>{action.label}</Link></Button>
          {signedIn && <div className="hidden text-site-ink lg:block"><UserMenu showName websiteMenu /></div>}
          {signedIn && <div className="text-site-ink lg:hidden"><UserMenu websiteMenu /></div>}
          <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}</Button>
        </div>
      </div>
      {menuOpen && <nav aria-label="Mobile" className="absolute inset-x-0 top-full flex h-[calc(100dvh-56px)] flex-col gap-1 overflow-y-auto bg-site-page px-5 py-8 safe-bottom lg:hidden">
        {signedIn && <Link to="/app/ads" onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center border-b border-site-line text-[24px] font-semibold text-site-primary">Open app</Link>}
        {nav.map((item) => <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center border-b border-site-line text-[24px] font-semibold text-site-ink">{item.label}</Link>)}
        {!signedIn && <Link to="/signin" onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center text-[18px] font-medium text-site-ink">Sign in</Link>}
      </nav>}
    </header>
  );
}

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
  return <div className="flex min-h-dvh flex-col bg-site-page font-site text-site-ink"><SiteHeader /><main className="min-h-[48dvh] flex-1">{children}</main><SiteFooter /><NewsletterPopup /></div>;
}