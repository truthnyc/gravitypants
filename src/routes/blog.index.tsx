import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { BlogCover } from "@/components/site/BlogVisual";
import { POSTS } from "@/lib/site/blog";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/blog/")({
  head: () => siteHead({ path: "/blog", title: "Blog — Gravity Pants", description: "Notes on making video ads from photos: craft, product thinking and why feeds reward movement." }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const featured = POSTS[0]!;
  const rest = POSTS.slice(1);
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-14 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Blog</p>
        <h1 className="mt-3 max-w-[720px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">Notes from the studio.</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Simple advice about choosing photos, adding movement and making ads people understand quickly.</p>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-24 md:px-8 lg:px-16 xl:px-24">
        <Link to="/blog/$slug" params={{ slug: featured.slug }} className="block rounded-[24px] bg-site-panel p-8 transition-colors hover:bg-site-innerPanel md:p-14">
          <BlogCover index={0} className="mb-8 aspect-[21/9]" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">{featured.tag}</p>
          <h2 className="mt-4 max-w-[720px] text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-site-ink md:text-[44px] md:tracking-[-0.03em]">{featured.title}</h2>
          <p className="mt-4 max-w-[560px] text-[17px] leading-[1.5] text-site-secondary">{featured.dek}</p>
          <p className="mt-6 text-[14px] text-site-muted">{featured.date} · {featured.minutes} min read</p>
        </Link>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rest.map((post, i) => (
            <Link key={post.slug} to="/blog/$slug" params={{ slug: post.slug }} className="block rounded-[24px] bg-site-panel p-6 transition-colors hover:bg-site-innerPanel md:p-8">
              <BlogCover index={i + 1} className="mb-6 aspect-[16/9]" />
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">{post.tag}</p>
              <h3 className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-site-ink">{post.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-site-secondary">{post.dek}</p>
              <p className="mt-5 text-[14px] text-site-muted">{post.date} · {post.minutes} min read</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
