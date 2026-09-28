import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { POSTS, postBySlug } from "@/lib/site/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.post.title} — Gravity Pants Blog`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.post.dek },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.post.dek },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <SiteShell>
      <article className="mx-auto max-w-[760px] px-5 pb-20 pt-16 md:pt-24">
        <Link to="/blog" className="text-[15px] font-medium text-site-primary">← All posts</Link>
        <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">{post.tag}</p>
        <h1 className="mt-3 text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-site-ink md:text-[52px] md:tracking-[-0.035em]">{post.title}</h1>
        <p className="mt-4 text-[15px] text-site-muted">{post.date} · {post.minutes} min read</p>
        {post.body.map((block, i) => (
          <section key={i} className="mt-8">
            {block.h && <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-site-ink">{block.h}</h2>}
            <div className={block.h ? "mt-3" : ""}>
              {block.p.map((paragraph, j) => (
                <p key={j} className="mt-4 text-[17px] leading-[1.6] text-site-secondary first:mt-0">{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </article>

      <section className="mx-auto w-full max-w-[1248px] px-5 pb-24 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Keep reading</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {others.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="block rounded-[24px] bg-site-panel p-6 transition-colors hover:bg-site-innerPanel md:p-8">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">{p.tag}</p>
              <h3 className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-site-ink">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-site-secondary">{p.dek}</p>
              <p className="mt-5 text-[14px] text-site-muted">{p.date} · {p.minutes} min read</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
