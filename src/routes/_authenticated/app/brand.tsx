import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/stillframe/FontPicker";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { ElementSlider } from "@/components/editor/Inspector";
import { BrandKitsSection } from "@/components/brand/BrandKits";
import { useBrandKit, useUpdateBrandKit } from "@/lib/stillframe/data";
import { loadFont } from "@/lib/stillframe/fonts";
import { uploadMedia } from "@/lib/stillframe/media";
import type { BrandKit, BrandLogo, BrandLogoRole, Format } from "@/lib/stillframe/types";
import { ANCHORS, DEFAULT_FONT } from "@/render/renderFrame";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/brand")({
  head: () => ({
    meta: [
      { title: "Brand Kit — Gravity Pants" },
      { name: "description", content: "Keep your logos, colors and fonts in one place so every ad matches your brand." },
      { property: "og:title", content: "Brand Kit — Gravity Pants" },
      { property: "og:description", content: "Logos, colors and fonts that every Gravity Pants ad reuses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandKitPage,
});

const ROLE_LABEL: Record<BrandLogoRole, string> = {
  primary: "Primary · for light photos",
  reversed: "Reversed · for dark photos",
  icon: "Icon · small formats",
  other: "Other version",
};
const SLOTS: BrandLogoRole[] = ["primary", "reversed", "icon"];
const FORMATS: { f: Format; w: number; h: number }[] = [
  { f: "9:16", w: 54, h: 96 },
  { f: "1:1", w: 84, h: 84 },
  { f: "16:9", w: 128, h: 72 },
];

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm bg-card p-6 shadow-card">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-secondary-text">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BrandKitPage() {
  const { data: kit, isLoading } = useBrandKit();
  if (isLoading || !kit) {
    return <main className="mx-auto max-w-[960px] px-4 py-6 text-[13px] text-secondary-text sm:px-8 sm:py-10">Loading your Brand Kit…</main>;
  }
  return <BrandKitEditor kit={kit} />;
}

function BrandKitEditor({ kit }: { kit: BrandKit }) {
  const update = useUpdateBrandKit();
  const save = (patch: Partial<BrandKit>) => update.mutate(patch);

  return (
    <main className="mx-auto max-w-[960px] space-y-5 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Brand Kit</h1>
        <p className="mt-1 text-[14px] text-secondary-text">Save logos, colors and fonts as kits. New ads start with your default kit.</p>
      </div>
      <BrandKitsSection />
      <h2 className="pt-4 text-[17px] font-semibold">Every ad</h2>
      <PlacementCard kit={kit} save={save} />
      <EndCardCard kit={kit} save={save} />
    </main>
  );
}

type SaveProps = { kit: BrandKit; save: (p: Partial<BrandKit>) => void };

function PlacementCard({ kit, save }: SaveProps) {
  const [size, setSize] = useState(kit.logo_size_pct ?? 16);
  const [sizeStatus, setSizeStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saved = kit.logo_size_pct ?? 16;
  useEffect(() => {
    if (size === saved) return;
    setSizeStatus("saving");
    const t = setTimeout(() => {
      save({ logo_size_pct: size });
      setSizeStatus("saved");
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);
  const positions = kit.default_logo_positions;
  const def: Record<Format, string> = { "9:16": "top-right", "1:1": "top-right", "16:9": "bottom-right" };
  return (
    <Card title="Default logo placement" hint="Where the logo sits in each format when you start a new ad.">
      <div className="flex flex-wrap items-end gap-10">
        {FORMATS.map(({ f, w, h }) => {
          const cur = positions[f] ?? def[f];
          return (
            <div key={f} className="flex flex-col items-center gap-2">
              <div className="grid grid-cols-3 grid-rows-3 gap-0.5 rounded-sm bg-control-fill p-1.5" style={{ width: w + 12, height: h + 12 }}>
                {ANCHORS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={`${f} ${a.replace(/-/g, " ")}`}
                    aria-pressed={cur === a}
                    onClick={() => save({ default_logo_positions: { ...positions, [f]: a } })}
                    className="flex items-center justify-center rounded-[2px] hover:bg-card"
                  >
                    <span className={cn("rounded-full", cur === a ? "size-2.5 bg-el-logo" : "size-1.5 bg-secondary-text/40")} />
                  </button>
                ))}
              </div>
              <span className="text-[12px] font-medium nums">{f}</span>
            </div>
          );
        })}
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between text-[12px] font-medium text-secondary-text">
            <span>Size</span>
            <span className="text-foreground nums">{size}% of width</span>
          </div>
          <ElementSlider
            name="Default logo size"
            color="var(--el-logo)"
            min={5}
            max={40}
            value={size}
            onChange={(v) => setSize(v)}
            left={<span className="size-2.5 rounded-[2px] bg-secondary-text/50" />}
            right={<span className="size-4 rounded-[3px] bg-secondary-text/50" />}
          />
          <p className="h-4 text-right text-[11px] text-secondary-text" aria-live="polite">
            {sizeStatus === "saving" ? "Saving…" : sizeStatus === "saved" ? "Saved" : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}

function EndCardCard({ kit, save }: SaveProps) {
  const [cta, setCta] = useState(kit.end_card.cta_text ?? "");
  const on = Boolean(kit.end_card.enabled);
  return (
    <Card title="End card" hint="A 1.5 second closing frame with your logo and a call to action.">
      <label className="flex items-center justify-between text-[14px]">
        Add an end card to new ads
        <Switch checked={on} onCheckedChange={(v) => save({ end_card: { ...kit.end_card, enabled: v } })} className="data-[state=checked]:bg-toggle-on" />
      </label>
      {on && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[12px] font-medium text-secondary-text">Call to action</div>
          <Input
            value={cta}
            placeholder="Shop now at yourstore.com"
            onChange={(e) => setCta(e.target.value)}
            onBlur={() => cta !== kit.end_card.cta_text && save({ end_card: { ...kit.end_card, cta_text: cta } })}
            className="h-9 max-w-[420px] rounded-sm"
          />
        </div>
      )}
    </Card>
  );
}
