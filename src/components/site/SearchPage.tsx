import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelVideo } from "@/components/site/ReelVideo";
import { Button } from "@/components/ui/button";
import { listSiteReels } from "@/lib/site/reels.functions";
import type { SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { POSTS } from "@/lib/site/blog";
import { SEARCH_PAGES, SEARCH_STEPS, sourcePhotos, type SearchPage as Page } from "@/lib/site/search-pages";

const ASPECT: Record<string, string> = { "916": "9 / 16", "11": "1 / 1", "169": "16 / 9" };

export function relatedLabel(path: string) {
  if (path.startsWith("/blog/")) return POSTS.find((p) => `/blog/${p.slug}` === path)?.title ?? path;
  return SEARCH_PAGES.find((p) => p.path === path)?.h1 ?? path;
}

/** Route options shared by all 13 search pages; content comes from search-pages.ts. */
export function searchPageRoute(page: Page) {
  return {
    loader: async () => ({ reels: await listSiteReels().catch(() => [] as SiteReel[]) }),
    head: () => {
      const head = siteHead({ path: page.path, title: page.title, description: page.description });
      const faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      };
      return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify(faq) }] };
    },
  };
}

/** A square light-grey tile showing the whole reel at its own shape. */
function ReelTile({ reel }: { reel: SiteReel }) {
  const tall = reel.format === "916";
  return (
    <div className="grid aspect-square w-full place-items-center rounded-lg bg-site-panel">
      <div className="examples-reel" style={{ aspectRatio: ASPECT[reel.format] ?? "1 / 1", height: tall ? "84%" : undefined, width: tall ? undefined : "80%" }}>
        <ReelVideo className="examples-reel-video" video={reel.video} videoWebm={reel.videoWebm ?? undefined} poster={reel.poster ?? undefined} label={`${reel.brand} ${reel.title} video ad`} />
      </div>
    </div>
  );
}

const h2 = "text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[36px]";
const body = "text-[17px] leading-[1.6] text-site-secondary";
const wrap = "mx-auto w-full max-w-[1080px] px-5 md:px-8";

function Cta({ slug }: { slug: string }) {
  return (
    <Button asChild variant="site" size="site">
      <a href={`/signup?ref=${encodeURIComponent(slug)}`} data-cta={`search-${slug}-signup`}>Make your first reel</a>
    </Button>
  );
}

export function SearchPage({ page, reels }: { page: Page; reels: SiteReel[] }) {
  const byId = new Map(reels.map((r) => [r.id, r]));
  const example = byId.get(page.example.reelId);
  const stills = sourcePhotos(page.example.reelId);
  const exampleLabel = page.example.label || (example ? `${example.brand}, ${example.title}` : "");
  const section = page.section;
  return (
    <SiteShell>
      <section className={`${wrap} pb-16 pt-16 text-center md:pt-24`}>
        <h1 className="mx-auto max-w-[820px] text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-site-ink md:text-[60px]">{page.h1}</h1>
        <p className={`mx-auto mt-5 max-w-[640px] ${body} md:text-[20px]`}>{page.subhead}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Cta slug={page.slug} />
          <Button asChild variant="siteSecondary" size="site"><Link to="/examples" data-cta={`search-${page.slug}-examples`}>See examples</Link></Button>
        </div>
        <p className="mt-4 text-[15px] text-site-muted">Your first reel is free, with no watermark and no card.</p>
      </section>

      {example && (
        <section className={`${wrap} pb-20`} aria-labelledby="before-after">
          <h2 id="before-after" className={h2}>Before and after</h2>
          <div className={`mt-8 grid items-center gap-6 ${stills.length ? "md:grid-cols-[1fr_auto_1fr]" : "md:max-w-[420px]"}`}>
            {stills.length > 0 && <>
              <div className="grid grid-cols-3 gap-3">
                {stills.map((s) => <img key={s.src} src={s.src} alt={s.alt} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover" />)}
              </div>
              <ArrowRight className="mx-auto rotate-90 text-site-muted md:rotate-0" size={28} strokeWidth={1.7} aria-hidden />
            </>}
            <ReelTile reel={example} />
          </div>
          {exampleLabel && <p className="mt-4 text-[15px] text-site-muted">Example: {exampleLabel}</p>}
        </section>
      )}

      <section className={`${wrap} pb-20`} aria-labelledby="how">
        <h2 id="how" className={h2}>How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {SEARCH_STEPS.map((s, i) => (
            <li key={s} className="flex items-baseline gap-3 text-[20px] font-semibold text-site-ink">
              <span className="tabular-nums text-site-primary">{i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </section>

      <section className={`${wrap} pb-20`} aria-labelledby="why">
        <h2 id="why" className={h2}>Why it sells</h2>
        <div className="mt-6 max-w-[720px] space-y-4">{page.why.map((p) => <p key={p} className={body}>{p}</p>)}</div>
      </section>

      <section className={`${wrap} pb-20`} aria-labelledby="specific">
        <h2 id="specific" className={h2}>{section.title}</h2>
        {"grid" in section ? (
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
            {section.grid.map((id) => byId.get(id)).filter((r): r is SiteReel => !!r).map((r) => (
              <figure key={r.id}>
                <ReelTile reel={r} />
                <figcaption className="mt-3 text-[15px] text-site-ink">{r.brand}<span className="text-site-muted"> · {r.title}</span></figcaption>
              </figure>
            ))}
          </div>
        ) : section.ordered ? (
          <ol className={`mt-6 max-w-[720px] list-decimal space-y-3 pl-6 ${body}`}>{section.items.map((t) => <li key={t}>{t}</li>)}</ol>
        ) : (
          <ul className={`mt-6 max-w-[720px] list-disc space-y-3 pl-6 ${body}`}>{section.items.map((t) => <li key={t}>{t}</li>)}</ul>
        )}
      </section>

      <section className={`${wrap} pb-20`} aria-labelledby="questions">
        <h2 id="questions" className={h2}>Questions</h2>
        <div className="mt-6 max-w-[760px] border-t border-site-hairline">
          {page.faqs.map((f) => (
            <details key={f.q} className="group border-b border-site-hairline">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold text-site-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} strokeWidth={1.7} className="shrink-0 text-site-muted group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <p className={`pb-5 ${body}`}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${wrap} pb-16 text-center`}>
        <h2 className={h2}>Your next reel is three photos away.</h2>
        <div className="mt-8 flex justify-center"><Cta slug={page.slug} /></div>
      </section>

      <nav className={`${wrap} pb-24`} aria-labelledby="related">
        <h2 id="related" className="text-[17px] font-semibold text-site-ink">Related</h2>
        <ul className="mt-3 space-y-2">
          {page.related.map((p) => <li key={p}><a href={p} className="text-[17px] text-site-primary hover:underline">{relatedLabel(p)}</a></li>)}
        </ul>
      </nav>
    </SiteShell>
  );
}

/** Links to the search pages, used at the end of related site pages. */
export function SearchPageLinks({ paths, className = "" }: { paths: string[]; className?: string }) {
  return (
    <nav className={className} aria-label="Related">
      <h2 className="text-[17px] font-semibold text-site-ink">Related</h2>
      <ul className="mt-3 space-y-2">
        {paths.map((p) => <li key={p}><a href={p} className="text-[17px] text-site-primary hover:underline">{relatedLabel(p)}</a></li>)}
      </ul>
    </nav>
  );
}
