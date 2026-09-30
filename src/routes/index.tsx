// TODO before launch: replace the reference placeholders [LOGO], [Your product line], [Customer logo], [Roaster name], [A customer quote about how fast they made their first reel, and what it did for their sales.], [Photo], [Customer name], [Role, Company], [X], [X] min, [X]%, [Result metric], [One-line result, e.g. how many ads they shipped for a launch], [One-line result, e.g. time saved each week], and [One-line result, e.g. lift in click-through].
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ReelVideo } from "@/components/site/ReelVideo";

import { ArrowRight, Check, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelPhone, type ReelFrame } from "@/components/site/ReelPhone";
import { FeaturedAdVideo } from "@/components/site/FeaturedAdVideo";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { Button } from "@/components/ui/button";
import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import heroPoster from "@/assets/site/example-of-the-week-poster.webp.asset.json";
import { siteHead } from "@/lib/site/seo";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";

export const Route = createFileRoute("/")({
  head: () => {
    const head = siteHead({
      path: "/",
      title: "Gravity Pants — Photos in. Reels out.",
      description: "Gravity Pants turns still photos into short video ads and animated GIFs for social.",
    });
    // Preload the hero reel's still frame so the largest element paints early.
    return {
      ...head,
      links: [...(head.links ?? []), { rel: "preload", as: "image", href: heroPoster.url, type: "image/webp" }],
    };
  },
  loader: () => listSiteReels().catch(() => [] as SiteReel[]),
  component: Home,
});

const colors = {
  hero: ["#C9B8A3", "#2F3A33", "#8C2F2B"],
  candle: ["#1F2937", "#8C2F2B", "#EBDDC6"],
  plant: ["#234A33", "#D98E5F", "#F1E4D3"],
  fashion: ["#B8C4D6", "#1D2A3A", "#E4B363"],
};
const exampleColors = [
  colors.fashion,
  ["#3A2E1F", "#B8860B", "#E6D5B8"],
  colors.candle,
  ["#E8C7C0", "#B85C4E", "#FFF6F2"],
  colors.plant,
  ["#E9C38B", "#8A5A2B", "#F6EBDD"],
  ["#D6E4F0", "#1D1D1F", "#E36A3A"],
  ["#2E2A3A", "#E4C27A", "#EFE7F2"],
];
function frames(name: string, palette: string[]): ReelFrame[] {
  return palette.map((background, i) => ({
    background,
    artwork: <img src={`/site-art/${name}-${i + 1}.svg`} alt="" />,
  }));
}
const purlFrames: ReelFrame[] = [photo1, photo2, photo3].map((photo) => ({
  background: "#1D2A3A",
  artwork: <img src={photo.url} alt="" />,
}));
type HomeExample = {
  name: string;
  headline?: string;
  subline?: string;
  detail: string;
  frames?: ReelFrame[];
  layout?: "top";
  logo?: string;
  video?: string;
  videoWebm?: string | undefined;
  poster?: string | undefined;
  videoFormat?: "11" | "916" | "169";
  href?: string | undefined;
};
// Drawn stand-ins fill the carousel between the real brand reels managed in /admin/reels.
const drawnExamples: HomeExample[] = [
  {
    name: "Coffee subscription",
    headline: "Slow mornings.\nFast shipping.",
    subline: "[Roaster name]",
    detail: "3 photos · 9 sec · 9:16 + 1:1",
  },
  {
    name: "Candle launch",
    headline: "Light up the\nlong nights.",
    subline: "Winter scents",
    detail: "3 photos · 7.5 sec · 9:16",
  },
  {
    name: "Plant shop promo",
    headline: "Bring the\noutside in.",
    subline: "Delivered potted",
    detail: "3 photos · 7.5 sec · 1:1",
  },
  { name: "Bakery weekend", headline: "Fresh out\nat 7am.", subline: "Order ahead", detail: "3 photos · 6 sec · 1:1" },
];
function homeExamples(reels: SiteReel[]): HomeExample[] {
  const real: HomeExample[] = reels.map((r) => ({
    name: r.title,
    logo: r.brand,
    detail: `${r.photos} photos · ${r.seconds} sec · ${FORMAT_LABEL[r.format]} · ${r.brand}`,
    video: r.video,
    videoWebm: r.videoWebm ?? undefined,
    poster: r.poster ?? undefined,
    videoFormat: r.format,
    href: r.href ?? undefined,
  }));
  const out: HomeExample[] = [];
  real.forEach((r, i) => {
    out.push(r);
    const d = drawnExamples[i];
    if (i % 2 === 1 && d) out.push(d);
  });
  return out.length ? out : drawnExamples;
}
function HomeReelVideo({ example }: { example: HomeExample }) {
  return (
    <div className={`home-example-video${example.videoFormat ? ` home-example-video-${example.videoFormat}` : ""}`}>
      <ReelVideo
        video={example.video!}
        videoWebm={example.videoWebm}
        poster={example.poster}
        label={`${example.name} video ad`}
      />
    </div>
  );
}

function HomeExampleMedia({ example, index, count }: { example: HomeExample; index: number; count: number }) {
  const media = example.video ? (
    <HomeReelVideo example={example} />
  ) : example.frames ? (
    <ReelPhone
      frames={example.frames}
      headline={example.headline ?? ""}
      subline={example.subline ?? ""}
      layout={example.layout}
      logo={example.logo}
    />
  ) : (
    <Reel
      id={`ex-${index % count}`}
      palette={exampleColors[index % exampleColors.length] ?? colors.fashion}
      headline={example.headline ?? ""}
      subline={example.subline ?? ""}
    />
  );
  return example.href ? (
    <a
      className="site-reel-link"
      href={example.href}
      target="_blank"
      rel="noreferrer"
      tabIndex={index >= count ? -1 : undefined}
      aria-label={`Visit ${example.logo ?? example.name}`}
    >
      {media}
    </a>
  ) : (
    media
  );
}
const tabs = ["Edit in a tap", "Brand kit", "Motion", "Timing", "Export"] as const;
type Tab = (typeof tabs)[number];
const tabCopy: Record<Tab, { title: string; body: string }> = {
  "Edit in a tap": {
    title: "Tap it. Change it.",
    body: "Photos, words, logos, timing and transitions each have their own simple controls. You only see the settings you need.",
  },
  "Brand kit": {
    title: "Keep every ad on brand.",
    body: "Save your logo, colors and fonts in a brand kit. They are already in place when you start a new ad.",
  },
  Motion: {
    title: "Add just enough movement.",
    body: "Choose how photos, words and frames move. Start with a preset, then adjust it if you want more control.",
  },
  Timing: {
    title: "Choose how long each photo stays.",
    body: "Hold an important photo a little longer or move quickly through the rest. Play the reel at any time to check the pace.",
  },
  Export: {
    title: "Download every size you need.",
    body: "Export 9:16, 1:1 and 16:9 together. Choose MP4 for ads and social posts, or GIF for email and websites.",
  },
};
function Primary({ children, to = "/signup" }: { children: React.ReactNode; to?: "/signup" | "/examples" }) {
  return (
    <Button asChild variant="site" size="site" className="home-button">
      <Link to={to}>{children}</Link>
    </Button>
  );
}
function Secondary({ children, to }: { children: React.ReactNode; to: "/pricing" | "/signup" | "/examples" }) {
  return (
    <Button asChild variant="siteSecondary" size="site" className="home-button">
      <Link to={to}>{children}</Link>
    </Button>
  );
}
function Heading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="home-heading">
      <span className="site-eyebrow">{eyebrow}</span>
      <h2 className="site-h2">{children}</h2>
    </div>
  );
}
function Reel({
  id,
  palette,
  headline,
  subline,
  size = "medium",
  logoBadge,
}: {
  id: string;
  palette: string[];
  headline: string;
  subline: string;
  size?: "small" | "medium" | "large";
  logoBadge?: React.ReactNode;
}) {
  return (
    <ReelPhone size={size} frames={frames(id, palette)} headline={headline} subline={subline} logoBadge={logoBadge} />
  );
}
function FormatShapes({ labelled = false }: { labelled?: boolean }) {
  return (
    <div className="home-formats">
      {["9:16", "1:1", "16:9"].map((x, i) => (
        <div key={x} className="home-format">
          <div className={`home-format-shape home-format-${i}`}>
            <b>
              New season.
              <br />
              New color.
            </b>
          </div>
          {labelled && <span>{x}</span>}
        </div>
      ))}
    </div>
  );
}
function BeforeAfter({
  id,
  palette,
  title,
  detail,
  headline,
  subline,
}: {
  id: "candle" | "plant";
  palette: string[];
  title: string;
  detail: string;
  headline: string;
  subline: string;
}) {
  return (
    <article className="site-card home-before-card">
      <div className="home-before-art">
        <div className="home-stills">
          {palette.map((color, i) => (
            <span key={color} className={`home-still home-still-${i + 1}`} style={{ backgroundColor: color }} />
          ))}
        </div>
        <ArrowRight className="home-arrow" strokeWidth={1.7} />
        <Reel id={id} palette={palette} headline={headline} subline={subline} logoBadge="[LOGO]" size="small" />
      </div>
      <div className="home-before-caption">
        <div>
          <h3>{title}</h3>
          <p>{detail}</p>
        </div>
        <Button asChild variant="siteSecondary" size="siteHeader" className="home-use">
          <Link to="/signup">Use this style</Link>
        </Button>
      </div>
    </article>
  );
}
function SpotlightArt({ active }: { active: Tab }) {
  if (active === "Brand kit")
    return (
      <div className="home-kit-preview">
        <div className="home-kit-swatches">
          <span className="home-kit-logo">LOGO</span>
          <span />
          <span />
          <span />
        </div>
        <div className="home-kit-fonts">
          <div>
            <b>Aa</b>
            <small>Headline · Bold</small>
          </div>
          <div>
            <b className="home-serif">Aa</b>
            <small>Subline · Regular</small>
          </div>
        </div>
      </div>
    );
  if (active === "Motion")
    return (
      <div className="home-motion-art">
        <Reel id="ex-0" palette={colors.fashion} headline={"New season.\nNew color."} subline="" size="small" />
        <div className="home-chip-stack">
          {["1 → 2 · Fade", "2 → 3 · Slide", "Headline · Rise up"].map((x) => (
            <span className="home-chip" key={x}>
              {x}
            </span>
          ))}
        </div>
      </div>
    );
  if (active === "Timing")
    return (
      <div className="home-timing-art">
        <div className="home-playline">
          <Play size={16} fill="currentColor" /> <b>0:02.4</b> / 0:08
        </div>
        <div className="home-timing-track">
          <span>1 · 3.5s</span>
          <span>2 · 1.5s</span>
          <span>3 · 3s</span>
          <i />
        </div>
      </div>
    );
  if (active === "Export") return <FormatShapes labelled />;
  return (
    <div className="home-edit-art">
      <div className="home-edit-reel">
        <span className="home-edit-logo" />
        <strong>
          New season.
          <br />
          New color.
        </strong>
        <small>[Your product line]</small>
        <span className="home-edit-label">Headline</span>
      </div>
      <div className="home-edit-panel">
        <b>Headline</b>
        <span>New season. New color.</span>
        <small>
          Size <b>108 px</b>
        </small>
        <div className="home-edit-progress">
          <i />
        </div>
        <small>
          Animation <b>Rise up</b>
        </small>
        <small>
          Same on all frames <i />
        </small>
      </div>
    </div>
  );
}
function Spotlight() {
  const [active, setActive] = useState<Tab>(tabs[0]);
  return (
    <section id="spotlight" className="home-section home-spotlight">
      <div className="home-spotlight-top">
        <Heading eyebrow="In the editor">
          Tap anything.
          <br />
          Change everything.
        </Heading>
        <div className="home-tabs" role="tablist" aria-label="Editor features">
          {tabs.map((tab) => (
            <Button
              key={tab}
              role="tab"
              aria-selected={tab === active}
              onClick={() => setActive(tab)}
              variant="siteTab"
              size="siteTab"
              className={tab === active ? "home-tab-active" : ""}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>
      <div className="site-card home-spotlight-card">
        <div className="home-spotlight-copy" role="tabpanel">
          <h3>{tabCopy[active].title}</h3>
          <p>{tabCopy[active].body}</p>
          {active === "Export" ? (
            <Primary>Make your first reel</Primary>
          ) : active === "Motion" ? (
            <div className="home-chips">
              {["Fade", "Slide", "Zoom", "Rise up"].map((x) => (
                <span className="home-chip" key={x}>
                  {x}
                </span>
              ))}
            </div>
          ) : (
            <Link className="home-text-link" to="/features">
              {active === "Edit in a tap"
                ? "All editing features"
                : active === "Brand kit"
                  ? "About brand kits"
                  : "About timing"}{" "}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <div className="home-spotlight-media">
          <SpotlightArt active={active} />
        </div>
      </div>
    </section>
  );
}
const features = [
  { title: "Brand kit", body: "Save your logo, colors and fonts once. Every new ad starts on brand.", art: "kit" },
  {
    title: "Simple motion controls",
    body: "Start with a transition or movement preset, then adjust the amount if you want to.",
    art: "motion",
  },
  {
    title: "Timing for each photo",
    body: "Choose how long each photo stays on screen. Drag to make it shorter or longer.",
    art: "timing",
  },
  {
    title: "Duplicate with new photos",
    body: "Made an ad that works? Swap in new photos and keep everything else.",
    art: "duplicate",
  },
  {
    title: "Export all your formats",
    body: "Download the sizes and file types you need together, ready to post.",
    art: "export",
  },
  {
    title: "Every Google Font",
    body: "Search the whole Google Fonts library right in the editor and preview it on your ad.",
    art: "fonts",
  },
  {
    title: "Keep every frame consistent",
    body: "Style a headline once and use the same look on every frame. You can still change individual frames.",
    art: "consistent",
  },
];
function FeatureArt({ art }: { art: string }) {
  if (art === "kit")
    return (
      <div className="home-feature-art home-feature-kit">
        <b>LOGO</b>
        <i />
        <i />
        <i />
        <strong>Aa</strong>
      </div>
    );
  if (art === "motion")
    return (
      <div className="home-feature-art home-chips">
        {["Fade", "Slide", "Zoom", "Rise up"].map((x) => (
          <span className="home-chip" key={x}>
            {x}
          </span>
        ))}
      </div>
    );
  if (art === "timing")
    return (
      <div className="home-feature-art home-timing-track">
        <span>2.5s</span>
        <span>1.5s</span>
        <span>3.5s</span>
      </div>
    );
  if (art === "duplicate")
    return (
      <div className="home-feature-art home-duplicate">
        <span />
        <ArrowRight size={26} strokeWidth={1.7} />
        <span />
        <span />
      </div>
    );
  if (art === "export")
    return (
      <div className="home-feature-art home-export-art">
        <span>
          <b>MP4</b>
          <small>for ads &amp; social</small>
        </span>
        <span>
          <b>GIF</b>
          <small>for email &amp; web</small>
        </span>
      </div>
    );
  if (art === "fonts")
    return (
      <div className="home-feature-art home-font-art">
        <span>Slow mornings.</span>
        <strong>Fast shipping.</strong>
        <small>new_arrivals</small>
      </div>
    );
  return (
    <div className="home-feature-art home-consistent">
      <span>
        Same on all frames <i />
      </span>
    </div>
  );
}
function Home() {
  const examples = homeExamples(Route.useLoaderData());
  return (
    <SiteShell>
      <div className="home-page">
        <section id="top" className="home-hero home-section">
          <div className="home-hero-copy">
            <a className="home-announcement" href="#features">
              Export MP4 and GIF together <span>See how it works</span>
            </a>
            <h1>
              Photos in.
              <br />
              <span>Reels out.</span>
            </h1>
            <p className="site-lede home-hero-lede">
              Add a few product photos. Gravity Pants turns them into a short video ad with your words, logo and colors.
              Download it in every size you need.
            </p>
            <div className="home-actions">
              <Primary>
                Make your first reel <ArrowRight size={18} strokeWidth={1.7} />
              </Primary>
              <Secondary to="/examples">
                <Play size={17} fill="currentColor" /> Watch examples
              </Secondary>
            </div>
            <p className="home-note">
              <span className="home-desktop-only">No video editing experience needed. </span>
              <span className="home-mobile-only">No video editing needed. </span>No editing skills needed. Start free
              and make your first reel in the next few minutes. Try every feature and make 3 watermarked exports.
            </p>
          </div>
          <div className="home-hero-visual" aria-hidden="true">
            <div className="home-drop home-drop-one">
              <img src={photo1.url} alt="" />
            </div>
            <div className="home-drop home-drop-two">
              <img src={photo2.url} alt="" />
            </div>
            <div className="home-drop home-drop-three">
              <img src={photo3.url} alt="" />
            </div>
            <div className="home-hero-phone">
              <FeaturedAdVideo />
            </div>
            <div className="site-card home-exported">
              <span>Exported</span>
              <div>
                <span>9:16</span>
                <span>1:1</span>
                <span>16:9</span>
              </div>
              <b>
                <Check size={14} strokeWidth={2} /> MP4 + GIF ready
              </b>
            </div>
          </div>
        </section>
        {/* Hidden until brand approvals: <section id="customers" className="home-logos home-section"><p>Brands making reels with Gravity Pants</p><div>{Array.from({ length: 6 }, (_, i) => <span key={i}>[Customer logo]</span>)}</div></section> */}
        <section id="how" className="home-section home-how">
          <Heading eyebrow="How it works">From photos to a finished reel.</Heading>
          <div className="home-how-grid">
            <article className="site-card home-step">
              <div className="home-step-art home-photos">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="home-step-copy">
                <span>01</span>
                <h3>Add your photos</h3>
                <p>Choose the photos you want to use. Each one becomes a frame in your reel.</p>
              </div>
            </article>
            <article className="site-card home-step">
              <div className="home-step-art">
                <div className="home-step-edit">
                  <b>New season.</b>
                  <small>[Your product line]</small>
                  <i>Headline</i>
                </div>
              </div>
              <div className="home-step-copy">
                <span>02</span>
                <h3>Add your words and brand</h3>
                <p>Tap a headline, logo, photo or transition to change it. Your work saves as you go.</p>
              </div>
            </article>
            <article className="site-card home-step">
              <div className="home-step-art">
                <FormatShapes />
              </div>
              <div className="home-step-copy">
                <span>03</span>
                <h3>Download your files</h3>
                <p>Get 9:16, 1:1 and 16:9 versions as MP4 or GIF, ready for social, ads, email and websites.</p>
              </div>
            </article>
          </div>
        </section>
        <section id="examples" className="home-examples">
          <div className="home-examples-top home-section">
            <Heading eyebrow="Made with Gravity Pants">
              Every one of these
              <br className="home-desktop-only" /> started as a few photos.
            </Heading>
            <div className="home-gallery-desktop">
              <Primary to="/examples">
                Browse the gallery <ArrowRight size={18} strokeWidth={1.7} />
              </Primary>
            </div>
          </div>
          <div className="home-example-viewport" aria-label="Example reels made with Gravity Pants">
            <div className="home-example-track">
              {[...examples, ...examples].map((ex, i) => (
                <figure
                  key={`${ex.name}-${i}`}
                  className="home-example-figure"
                  aria-hidden={i >= examples.length ? true : undefined}
                >
                  <HomeExampleMedia example={ex} index={i} count={examples.length} />
                  <figcaption>
                    <b>{ex.name}</b>
                    <span>{ex.detail}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="site-gallery-cta home-section">
            Want a reel like these for your brand?{" "}
            <Link to="/contact">
              Tell us about it <ArrowRight size={16} strokeWidth={1.7} />
            </Link>
          </p>
          <div className="home-gallery-mobile home-section">
            <span className="home-swipe-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <Link className="home-text-link" to="/examples">
              Browse the gallery <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section id="before-after" className="home-section home-before">
          <div className="home-before-top">
            <Heading eyebrow="Before and after">See what three photos can become.</Heading>
            <p className="site-lede">
              Gravity Pants adds movement, words and your brand, then turns the result into a finished reel.
            </p>
          </div>
          <div className="home-before-grid">
            <BeforeAfter
              id="candle"
              palette={colors.candle}
              title="Candle launch"
              detail="3 photos → 7.5 sec reel · Fade, Slide, Zoom"
              headline={"Light up the\nlong nights."}
              subline="Winter scents · Shop now"
            />
            <BeforeAfter
              id="plant"
              palette={colors.plant}
              title="Plant shop promo"
              detail="3 photos → 7.5 sec reel · 9:16 + 1:1"
              headline={"Bring the\noutside in."}
              subline="Delivered potted · Shop now"
            />
          </div>
        </section>
        <Spotlight />
        <section id="features" className="home-section home-features">
          <Heading eyebrow="Features">The tools you need to make and reuse ads.</Heading>
          <div className="home-features-grid">
            <article className="site-card home-feature home-feature-wide">
              <div>
                <h3>See every format while you edit</h3>
                <p>
                  Check your ad as a Story, square post and wide banner. The layout adjusts to each size so your words
                  and logo stay in view.
                </p>
              </div>
              <FormatShapes labelled />
            </article>
            {features.map((f) => (
              <article
                className={`site-card home-feature ${f.art === "export" ? "home-feature-blue" : ""}`}
                key={f.title}
              >
                <FeatureArt art={f.art} />
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="home-section home-proof">
          <div className="home-quote">
            <span className="home-quote-mark">“</span>
            <p>
              "We shot a few photos of our products and had a finished reel for Instagram in minutes. It looks like our
              brand, not a template, and we didn't need a video editor to get there."
            </p>
            <div className="home-person">
              <span> </span>
              <div>
                <b> </b>
                <small> </small>
              </div>
            </div>
          </div>
          <div className="home-stats">
            {[
              ["10 min", "to your first ad"],
              ["3", "formats from one edit"],
              ["6", "ready-made templates"],
              ["0", "video skills needed"],
            ].map(([num, label], i) => (
              <div className="site-card" key={i}>
                <b>{num}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
        <section id="start" className="home-section home-closing">
          <div className="site-card home-closing-inner">
            <div className="home-closing-icon">
              <GravityPantsLogo size={64} />
            </div>
            <div className="home-closing-copy">
              <h2 className="site-h2">Your next ad is three photos away.</h2>
              <p className="site-lede">Start free and make your first reel in the next few minutes.</p>
              <div className="home-actions">
                <Primary>Start free</Primary>
                <Secondary to="/pricing">See pricing</Secondary>
              </div>
            </div>
            <div className="home-closing-orbit" aria-hidden="true">
              <span />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
