import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { listSiteReels } from "@/lib/site/reels.functions";
import { LAUNCH_FILM } from "@/lib/site/launch-film";
import { type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { FORMAT_SIZE, watchSlugs } from "@/lib/site/watch";

export const Route = createFileRoute("/reels/")({
  loader: async () => {
    const all = [...(await listSiteReels().catch(() => [] as SiteReel[])), LAUNCH_FILM];
    const slugs = watchSlugs(all); // same set as siteWatchSlugs
    return all.map((reel) => ({ reel, slug: slugs.get(reel.id)! }));
  },
  head: () => siteHead({ path: "/reels", title: "Video ad reels made from product photos | Gravity Pants", description: "Watch every reel made with Gravity Pants: short video ads that brands made from a few still product photos." }),
  component: ReelsIndex,
  errorComponent: () => <SiteShell><p className="mx-auto max-w-[1080px] px-5 py-24 text-site-ink">Reels couldn't load. Please try again.</p></SiteShell>,
  notFoundComponent: () => <SiteShell><p className="mx-auto max-w-[1080px] px-5 py-24 text-site-ink">No reels yet.</p></SiteShell>,
});

function ReelsIndex() {
  const items = Route.useLoaderData();
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1080px] px-5 pb-20 pt-16 md:px-8 md:pt-24">
        <span className="site-eyebrow">Reels</span>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-site-ink md:text-[56px]">Every reel, made from photos.</h1>
        <p className="mt-4 max-w-[640px] text-[17px] leading-[1.6] text-site-secondary">Each one started as a few still product photos. Open a reel to watch it and see how it was made.</p>
        <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map(({ reel: r, slug }) => (
            <li key={r.id}>
              <Link to="/reels/$slug" params={{ slug }} className="group block">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-[4px] bg-site-panel">
                  {r.poster && <img src={r.poster} alt={`${r.brand} reel thumbnail`} loading="lazy" width={FORMAT_SIZE[r.format].width} height={FORMAT_SIZE[r.format].height} className="h-[86%] w-auto max-w-[90%] rounded-[4px] object-contain" />}
                </div>
                <p className="mt-3 text-[15px] text-site-ink group-hover:text-site-link">{r.brand}<span className="text-site-muted"> · {r.displayTitle?.trim() || r.title}</span></p>
                <p className="text-[13px] tabular-nums text-site-muted">{FORMAT_SIZE[r.format].label} · {Math.round(r.seconds)} sec</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
