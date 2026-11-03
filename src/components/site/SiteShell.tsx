import { BrandPreviewHost } from "./BrandPreview";
import { Link } from "@tanstack/react-router";
import { Instagram, Minus, Plus, Youtube } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { FooterNewsletter, NewsletterPopup } from "@/components/site/Newsletter";
import { SHOW_DIRECTORY } from "@/lib/features";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { AimanteShell, useBrandSite } from "@/components/site/AimanteShell";
import { MADE_FOR_LINKS } from "@/lib/site/search-pages";

const STATUS_URL = "https://status.gravitypants.com";

type FooterLink = { label: string; to: string; external?: boolean; badge?: string; search?: Record<string, string> };
const columns: { label: string; links: FooterLink[] }[] = [
  { label: "Product", links: [{ label: "How it works", to: "/how-it-works" }, { label: "Features", to: "/features" }, { label: "Pricing", to: "/pricing" }] },
  {
    label: "Explore",
    links: [
      ...(SHOW_DIRECTORY ? [{ label: "Directory", to: "/directory", badge: "New" }] : []),
      { label: "Examples", to: "/examples" },
      { label: "Showcase", to: "/showcase" },
      { label: "Reels", to: "/reels" },
      { label: "Blog", to: "/blog" },
      { label: "Aimanté directory", to: "https://aimante.co", external: true },
    ],
  },
  { label: "Made for", links: MADE_FOR_LINKS },
  { label: "Company", links: [{ label: "About", to: "/about" }, { label: "Commission a reel", to: "/contact", search: { topic: "brand-reel" } }, { label: "Contact", to: "/contact" }] },
  { label: "Help", links: [{ label: "Help center", to: "/help" }, { label: "Status", to: STATUS_URL, external: true }] },
];

const linkCls = "inline-flex items-center gap-1.5 text-[14px] text-ap-body hover:text-ap-blue";

function FooterLinkItem({ link }: { link: FooterLink }) {
  const inner = (
    <>
      {link.label}
      {link.badge && <span className="rounded-md bg-ap-soft-blue px-1.5 py-px text-[11px] font-semibold text-ap-blue-strong">{link.badge}</span>}
    </>
  );
  return link.external ? (
    <a href={link.to} target="_blank" rel="noopener noreferrer" className={linkCls}>{inner}</a>
  ) : (
    <Link to={link.to as "/"} {...(link.search ? { search: link.search as never } : {})} className={linkCls}>{inner}</Link>
  );
}

function Brand() {
  return (
    <div>
      <GravityPantsLogo size={28} showWordmark wordmarkSize={17} />
      <p className="mt-3 max-w-[300px] text-[14px] leading-normal text-ap-body">Turn the photos you already have into short films for your brand.</p>
      {SOCIAL_LINKS.some((s) => s.url) && (
        <div className="mt-4 flex gap-2">
          {SOCIAL_LINKS.filter((s) => s.url).map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="grid size-[34px] min-h-0 min-w-0 place-items-center rounded-lg border border-ap-hairline bg-ap-card text-ap-ink hover:text-ap-blue">
              {s.name === "YouTube" ? <Youtube size={17} strokeWidth={1.7} /> : <Instagram size={17} strokeWidth={1.7} />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Column({ column }: { column: (typeof columns)[number] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-ap-ink">{column.label}</span>
      {column.links.map((l) => <FooterLinkItem key={l.label} link={l} />)}
    </div>
  );
}

function Collapsible({ column, defaultOpen }: { column: (typeof columns)[number]; defaultOpen: boolean }) {
  // Opens after load so the server page holds only one copy of each footer link.
  const [open, setOpen] = useState(false);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  const id = `footer-${column.label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="border-b border-ap-hairline">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="flex min-h-12 w-full items-center justify-between text-[15px] font-semibold text-ap-ink">
        {column.label}
        {open ? <Minus size={18} strokeWidth={1.7} aria-hidden /> : <Plus size={18} strokeWidth={1.7} aria-hidden />}
      </button>
      {open && <div id={id} className="flex flex-col gap-1 pb-4">{column.links.map((l) => <FooterLinkItem key={l.label} link={l} />)}</div>}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ap-hairline bg-ap-panel font-ap text-ap-ink">
      <div className="mx-auto max-w-[1280px] px-6 pb-7 pt-12">
        {/* One copy of every link for all sizes, so crawlers and screen readers see each once. */}
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_1fr_1.6fr]">
          <Brand />
          <div className="self-start lg:order-last"><FooterNewsletter /></div>
          <div className="hidden md:col-span-2 md:mt-3 md:grid md:grid-cols-5 md:gap-7 lg:contents">{columns.map((c) => <Column key={c.label} column={c} />)}</div>
          <div className="border-t border-ap-hairline md:hidden">{columns.map((c, i) => <Collapsible key={c.label} column={c} defaultOpen={i === 0} />)}</div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ap-hairline pt-5 text-[13px] text-ap-muted">
          <span>© {new Date().getFullYear()} Gravity Pants</span>
          <Link to="/privacy" className="min-h-0 min-w-0 hover:text-ap-blue">Privacy</Link>
          <Link to="/terms" className="min-h-0 min-w-0 hover:text-ap-blue">Terms</Link>
          <a href={STATUS_URL} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex min-h-0 items-center gap-1.5 hover:text-ap-blue">
            <span className="size-2 rounded-full bg-ap-green" aria-hidden /> Status
          </a>
          <p className="w-full pt-1 text-[12px] text-ap-muted">Gravity Pants and Aimanté are trademarks of Truth NYC LLC.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const site = useBrandSite();
  if (site === "aimante") return <AimanteShell>{children}</AimanteShell>;
  return <div className="flex min-h-dvh flex-col bg-site-page font-site text-site-ink"><SiteHeader variant="site" /><main className="min-h-[48dvh] flex-1">{children}</main><SiteFooter /><NewsletterPopup /><BrandPreviewHost /></div>;
}
