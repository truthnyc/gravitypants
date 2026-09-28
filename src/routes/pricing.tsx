// TODO placeholders to confirm before launch: "[USD]", "[Taxes may apply.]", and the FAQ answers written in [brackets].
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { CheckoutDialog, type CheckoutTarget } from "@/components/billing/CheckoutDialog";
import { currentWorkspaceId } from "@/lib/stillframe/billing";
import { COMPARE, FAQ, PLANS, TRIAL, YEARLY_LABEL, priceFor, signupHref, type Billing, type PlanConfig } from "@/lib/stillframe/plans-config";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Gravity Pants" },
      { name: "description", content: "Simple, Business and Team plans for turning photos into video ads and GIFs. Every account starts with a 7-day free trial." },
      { property: "og:title", content: "Pricing — Gravity Pants" },
      { property: "og:description", content: "Start free for 7 days. Grow into Simple, Business or Team when you’re ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const Tick = () => <Check className="pr-tick" strokeWidth={1.8} aria-label="Included" />;

function CellView({ v }: { v: string | boolean }) {
  if (v === true) return <Tick />;
  if (v === false) return <span className="pr-no" aria-label="Not included">—</span>;
  const [a, b] = v.split("|");
  return <>{a}{b && <><br /><small>{b}</small></>}</>;
}

function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [open, setOpen] = useState<number | null>(0);
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const cols = ["Free trial", ...PLANS.map((p) => p.name)];

  // Signed-in users pay right away and the workspace switches to the plan; visitors sign up first.
  async function choose(p: PlanConfig) {
    const ws = await currentWorkspaceId();
    if (!ws) {
      window.location.href = signupHref(p, billing);
      return;
    }
    const key = billing === "yearly" && p.yearly != null ? `${p.id}_yearly` : `${p.id}_monthly`;
    setCheckout({ priceId: key, ws });
  }

  return (
    <SiteShell>
      <div className="pricing-page">
        <section className="pr-hero">
          <span className="site-eyebrow">Pricing</span>
          <h1>Start free.<br /><span>Grow when you’re ready.</span></h1>
          <p className="site-lede">Every plan makes reels in all three formats, as MP4 and GIF. Try everything free for {TRIAL.days} days.</p>
          <div role="group" aria-label="Billing period" className="pr-switch">
            {(["monthly", "yearly"] as const).map((b) => (
              <button key={b} className={billing === b ? "on" : ""} aria-pressed={billing === b} onClick={() => setBilling(b)}>
                {b === "monthly" ? "Monthly" : <>Yearly <em>{YEARLY_LABEL}</em></>}
              </button>
            ))}
          </div>
        </section>

        <section className="pr-tiers">
          <div className="pr-trial">
            <span className="pr-trial-ic"><Clock strokeWidth={1.8} /></span>
            <div><b>Start with a {TRIAL.days}-day free trial</b><span>{TRIAL.blurb}</span></div>
            <Link to="/signup" className="pr-btn pri">Start free trial</Link>
          </div>
          <div className="pr-grid">
            {PLANS.map((p) => {
              const pr = priceFor(p, billing);
              const pop = p.id === "team";
              return (
                  <article key={p.id} className={`pr-tier${pop ? " pop" : ""}`}>
                  <div className="pr-tier-top"><h3>{p.name}</h3><p>{p.tagline}</p></div>
                  <div className="pr-price"><b>{pr.price}</b><span>{pr.per}</span></div>
                  <span className="pr-note">{pr.note}</span>
                  <button type="button" onClick={() => void choose(p)} className={`pr-btn ${pop ? "pri" : "sec"} full`}>Choose {p.name}</button>
                  <ul>{p.features.map((f) => <li key={f}><Tick /><span>{f}</span></li>)}</ul>
                </article>
              );
            })}
          </div>
          <p className="pr-fine">Prices in [USD]. [Taxes may apply.] One export is one reel, whatever the number of formats and files. Export counts reset on each billing date. Need more seats? <Link to="/app/help">Talk to us</Link>.</p>
        </section>

        <section className="pr-compare">
          <h2 className="site-h2">Compare plans</h2>
          <table className="pr-cmp">
            <thead><tr><th scope="col"><span className="sr-only">Feature</span></th>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {COMPARE.flatMap((g) => [
                <tr key={g.group} className="grp"><th colSpan={5} scope="colgroup">{g.group}</th></tr>,
                ...g.rows.map((r) => (
                  <tr key={g.group + r.label}><th scope="row">{r.label}</th>{r.cells.map((c, i) => <td key={i}><CellView v={c} /></td>)}</tr>
                )),
              ])}
            </tbody>
          </table>
          <div className="pr-cmp-cards">
            {cols.map((c, i) => (
              <div key={c} className="pr-cmp-card">
                <h3>{c}</h3>
                {COMPARE.map((g) => (
                  <div key={g.group}>
                    <small>{g.group}</small>
                    <ul>{g.rows.map((r) => <li key={r.label}><span>{r.label}</span><span><CellView v={r.cells[i] ?? ""} /></span></li>)}</ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="pr-faq">
          <div className="pr-faq-head"><h2 className="site-h2">Questions</h2><p className="site-lede">Something else? <Link to="/app/help">Get in touch</Link>.</p></div>
          <div>
            {FAQ.map((f, i) => (
              <div key={f.q} className="pr-faq-item">
                <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  <span>{f.q}</span><span className={`pr-pl${open === i ? " open" : ""}`} aria-hidden="true">+</span>
                </button>
                {open === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="pr-cta">
          <div>
            <h2 className="site-h2">Your next ad is three photos away.</h2>
            <p className="site-lede">Start free and make your first reel in the next few minutes.</p>
            <div className="pr-cta-actions"><Link to="/signup" className="pr-btn pri big">Start free</Link><Link to="/examples" className="pr-btn sec big white">See examples</Link></div>
          </div>
        </section>
      </div>
      <CheckoutDialog checkout={checkout} onClose={() => setCheckout(null)} />
    </SiteShell>
  );
}
