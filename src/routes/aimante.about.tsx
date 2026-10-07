import { createFileRoute, Link } from "@tanstack/react-router";
import { aimanteHead } from "@/lib/site/brand-site";
import { AimanteShell } from "@/components/site/AimanteShell";
import { getDirectoryPublic } from "@/lib/directory/settings.functions";
import type { FacetedReel } from "@/lib/directory/directory.functions";

export const Route = createFileRoute("/aimante/about")({
  loader: async () => {
    const dir = await getDirectoryPublic().catch(() => ({ featured: [] as FacetedReel[] }));
    return { reels: (dir.featured ?? []).filter((r) => r.poster).slice(0, 5) };
  },
  head: () => aimanteHead({ path: "/about", title: "About Aimanté — Discover brands by mood", description: "Aimanté is a visual directory where you discover brands through short reels, by mood and feeling." }),
  component: About,
});

const SHAPE: Record<string, string> = { "9x16": "w-[150px] aspect-[9/16]", "1x1": "w-[200px] aspect-square", "16x9": "w-[280px] aspect-video" };
const MOODS = ["soothing", "elegant", "cozy", "playful", "bold", "inspiring"];
const primary = "inline-flex h-11 items-center justify-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover";
const grey = "inline-flex h-11 items-center justify-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline";

const STEPS = [
  ["Pick a mood", "Soothing, elegant, cozy, playful. Start with a feeling, or pick a category."],
  ["Watch a few seconds", "Every brand shows itself in a short reel. No long pages, no pop-ups."],
  ["Visit the ones you love", "Save your favourites with the heart, then go straight to the brand."],
];
const WHY = [
  ["Discover, don't scroll.", "A calm, curated place to find brands, not an endless feed."],
  ["Small and large, side by side.", "Independent makers next to well-known houses."],
  ["Seen in motion.", "Products, places and work shown as they really look."],
  ["Something new each day.", "Fresh picks in Featured this week."],
];

function About() {
  const { reels } = Route.useLoaderData();
  return (
    <AimanteShell>
      <div className="font-ap text-ap-ink">
        <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-20 text-center">
          <h1 className="text-[clamp(38px,5vw,64px)] font-semibold leading-[1.05] tracking-[-0.035em]">Find brands you'll love.</h1>
          <p className="mt-2 text-[clamp(26px,3.4vw,44px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ap-headline-muted">Browse by feeling, not by search terms.</p>
          <p className="mx-auto mt-6 max-w-[620px] text-[18px] leading-[1.5] text-ap-body">Aimanté is a visual directory of brands, shown through short reels. Tell us how you want to feel today, and we'll show you something.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/directory" className={primary}>Show me something →</Link>
            <Link to="/directory" hash="directory-results" className={grey}>Browse all reels</Link>
          </div>
        </section>

        {reels.length > 0 && (
          <section aria-label="Featured this week" className="bg-ap-panel py-14">
            <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-6 overflow-x-auto px-6">
              {reels.map((r) => (
                <Link key={r.id} to="/directory/$slug" params={{ slug: r.brand_slug }} aria-label={`${r.title} by ${r.brand_name}`}
                  className={`${SHAPE[r.formats[0] ?? "9x16"] ?? SHAPE["9x16"]} shrink-0 overflow-hidden rounded-[8px] bg-ap-card shadow-ap-soft`}>
                  <img src={r.poster!} alt="" loading="lazy" className="size-full object-cover" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-[760px] px-6 py-20 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ap-blue">The name</p>
          <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.03em]"><em>Aimanté</em> is French for 'magnetized.'</h2>
          <p className="mt-4 text-[18px] leading-[1.5] text-ap-body">It shares its root with <em>aimer</em>, to love. These are brands that pull you in because you love them.</p>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 pb-20">
          <h2 className="text-center text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.03em]">How it works</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-[12px] bg-ap-panel p-7">
                <span className="grid size-9 place-items-center rounded-full bg-ap-blue text-[15px] font-semibold text-ap-card nums">{i + 1}</span>
                <h3 className="mt-5 text-[19px] font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-ap-body">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 pb-20">
          <h2 className="text-center text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.03em]">Why browse Aimanté</h2>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(([t, d]) => (
              <div key={t}><h3 className="text-[17px] font-semibold">{t}</h3><p className="mt-2 text-[15px] leading-[1.5] text-ap-muted">{d}</p></div>
            ))}
          </div>
        </section>

        <section className="bg-ap-panel px-6 py-20 text-center">
          <p className="text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.035em]">Show me something: <span className="text-ap-headline-muted">[ <span className="text-ap-ink">mood</span> ]</span></p>
          <div className="mx-auto mt-8 flex max-w-[720px] flex-wrap justify-center gap-3">
            {MOODS.map((m) => (
              <Link key={m} to="/directory" search={{ mood: m } as never} className="inline-flex h-10 items-center rounded-lg bg-ap-card px-4 text-[15px] font-medium text-ap-ink shadow-ap-soft hover:text-ap-blue">{m}</Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-24 text-center">
          <h2 className="text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.035em]">What will you fall for today?</h2>
          <Link to="/directory" className={`${primary} mt-8`}>Start browsing →</Link>
          <p className="mt-6 text-[13px] text-ap-muted">Aimanté is made by Gravity Pants. Every reel here was made with it.</p>
          <p className="mt-3 text-[13px]"><Link to="/aimante/join" className="font-medium text-ap-blue hover:underline">Have a brand? See how to list it →</Link></p>
        </section>
      </div>
    </AimanteShell>
  );
}
