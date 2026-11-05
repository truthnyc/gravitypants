import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { AppButton } from "@/components/app-ui";
import { getDirectoryAccount } from "@/lib/directory/directory.functions";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { BADGE_VARIANTS, badgeSnippet, bioLine, brandPageUrl } from "@/lib/directory/badge";

export const Route = createFileRoute("/_authenticated/app/account_/brand-kit")({
  head: () => ({
    meta: [
      { title: "Brand kit — Aimanté badge" },
      { name: "description", content: "Copy an optional “As seen on Aimanté” badge and link for your website, press page or bio." },
      { property: "og:title", content: "Brand kit — Aimanté badge" },
      { property: "og:description", content: "An optional badge and link back to your Aimanté brand page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandKit,
});

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast.error("Couldn't copy. Select the text and copy it instead."); }
}

function CopyBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-ap-muted">{label}</span>
        <AppButton variant="ghost" size="sm" onClick={() => void copy(text)}><Copy className="size-4" strokeWidth={1.7} />Copy</AppButton>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-[4px] border border-ap-hairline bg-ap-panel p-3 font-mono text-[12px] leading-[1.5] text-ap-ink">{text}</pre>
    </div>
  );
}

function BrandKit() {
  const ws = getWorkspaceId();
  const load = useServerFn(getDirectoryAccount);
  const q = useQuery({ queryKey: ["directory-account", ws], queryFn: () => load({ data: { workspaceId: ws } }) });
  const d = q.data;
  return (
    <main className="acct mx-auto flex w-full max-w-[780px] flex-col gap-4 px-4 pb-20 pt-9 sm:px-6">
      <h1 className="acct-h1">Brand kit</h1>
      <AccountTabs />
      {q.isLoading ? <div className="h-40 rounded-[24px] bg-ap-card" aria-busy="true" /> : !d ? (
        <section className="acct-card">
          <h2 className="text-[20px] font-semibold">No brand page yet</h2>
          <p className="mt-1 text-[14px] text-ap-body">Once your brand has an Aimanté page, its badge and link appear here.</p>
          <AppButton asChild className="mt-4"><Link to="/app/account/directory">Your brand page</Link></AppButton>
          <div className="mt-6 flex flex-wrap gap-6">
            {BADGE_VARIANTS.map((v) => (
              <div key={v} className="flex flex-col items-start gap-2">
                <div className={v === "dark" ? "inline-flex rounded-[4px] bg-ap-ink p-4" : "inline-flex rounded-[4px] border border-ap-hairline bg-ap-card p-4"}>
                  <img src={`/badge/${v}.svg`} alt="As seen on Aimanté" width={160} height={40} />
                </div>
                <AppButton asChild variant="ghost" size="sm"><a href={`/badge/${v}.svg`} download={`as-seen-on-aimante-${v}.svg`}><Download className="size-4" strokeWidth={1.7} />Download {v} SVG</a></AppButton>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="acct-card">
            <h2 className="text-[20px] font-semibold">“As seen on Aimanté” badge</h2>
            <p className="mt-1 text-[14px] leading-[1.5] text-ap-body">An optional badge for your website that links to <a href={brandPageUrl(d.brand.slug)} target="_blank" rel="noreferrer" className="text-ap-blue">your Aimanté page</a>. It's never required to stay listed.</p>
            {!d.brand.live && <p className="mt-3 text-[14px] text-ap-body">Your page isn't live yet. The link will work once it's published.</p>}
            {BADGE_VARIANTS.map((v) => (
              <div key={v} className="mt-6">
                <h3 className="text-[15px] font-semibold capitalize">{v}</h3>
                <div className={v === "dark" ? "mt-2 inline-flex rounded-[4px] bg-ap-ink p-4" : "mt-2 inline-flex rounded-[4px] border border-ap-hairline bg-ap-card p-4"}>
                  <img src={`/badge/${v}.svg`} alt="As seen on Aimanté" width={160} height={40} />
                </div>
                <div className="mt-2">
                  <AppButton asChild variant="ghost" size="sm"><a href={`/badge/${v}.svg`} download={`as-seen-on-aimante-${v}.svg`}><Download className="size-4" strokeWidth={1.7} />Download SVG</a></AppButton>
                </div>
                <CopyBox label="HTML for your website" text={badgeSnippet(d.brand.slug, v)} />
              </div>
            ))}
          </section>
          <section className="acct-card">
            <h2 className="text-[20px] font-semibold">For a press page or Instagram bio</h2>
            <CopyBox label="Plain text" text={bioLine(d.brand.slug)} />
          </section>
        </>
      )}
    </main>
  );
}
