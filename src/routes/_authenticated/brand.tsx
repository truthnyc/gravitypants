import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/stillframe/FontPicker";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { ElementSlider } from "@/components/editor/Inspector";
import { useBrandKit, useUpdateBrandKit } from "@/lib/stillframe/data";
import { loadFont } from "@/lib/stillframe/fonts";
import { uploadMedia } from "@/lib/stillframe/media";
import type { BrandKit, BrandLogo, BrandLogoRole, Format } from "@/lib/stillframe/types";
import { ANCHORS, DEFAULT_FONT } from "@/render/renderFrame";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/brand")({
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
    return <main className="mx-auto max-w-[960px] px-8 py-10 text-[13px] text-secondary-text">Loading your Brand Kit…</main>;
  }
  return <BrandKitEditor kit={kit} />;
}

function BrandKitEditor({ kit }: { kit: BrandKit }) {
  const update = useUpdateBrandKit();
  const save = (patch: Partial<BrandKit>) => update.mutate(patch);

  return (
    <main className="mx-auto max-w-[960px] space-y-5 px-8 pb-16 pt-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Brand Kit</h1>
        <p className="mt-1 text-[14px] text-secondary-text">New ads start with these logos, colors and fonts.</p>
      </div>
      <LogosCard kit={kit} save={save} />
      <div className="grid gap-5 md:grid-cols-2">
        <ColorsCard kit={kit} save={save} />
        <FontsCard kit={kit} save={save} />
      </div>
      <PlacementCard kit={kit} save={save} />
      <EndCardCard kit={kit} save={save} />
    </main>
  );
}

type SaveProps = { kit: BrandKit; save: (p: Partial<BrandKit>) => void };

function LogosCard({ kit, save }: SaveProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<BrandLogoRole>("primary");
  const [busy, setBusy] = useState<BrandLogoRole | null>(null);

  const pick = (role: BrandLogoRole) => {
    target.current = role;
    fileRef.current?.click();
  };
  const upload = async (file: File) => {
    if (!/\.(png|svg|webp)$/i.test(file.name)) {
      toast.error("Choose a PNG or SVG with a see-through background.");
      return;
    }
    const role = target.current;
    setBusy(role);
    try {
      const up = await uploadMedia(file, "logo");
      const logo: BrandLogo = { id: crypto.randomUUID(), path: up.path, name: file.name, role };
      const logos = role === "other" ? [...kit.logos, logo] : [...kit.logos.filter((l) => l.role !== role), logo];
      save({ logos });
    } catch {
      toast.error("That logo couldn't be uploaded. Try again.");
    } finally {
      setBusy(null);
    }
  };
  const tiles: { role: BrandLogoRole; logo: BrandLogo | undefined }[] = [
    ...SLOTS.map((role) => ({ role, logo: kit.logos.find((l) => l.role === role) })),
    ...kit.logos.filter((l) => l.role === "other").map((logo) => ({ role: "other" as const, logo })),
  ];

  return (
    <Card title="Logos" hint="PNG or SVG with a see-through background.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(({ role, logo }, i) => (
          <div key={logo?.id ?? `${role}-${i}`} className="group">
            <button
              type="button"
              onClick={() => pick(role)}
              className={cn(
                "relative flex h-[120px] w-full items-center justify-center rounded-sm",
                role === "reversed" ? "bg-foreground" : "bg-control-fill",
                !logo && "border border-dashed border-placeholder-border",
              )}
              aria-label={logo ? `Replace ${ROLE_LABEL[role]}` : `Add ${ROLE_LABEL[role]}`}
            >
              {logo ? (
                <MediaImage path={logo.path} alt={logo.name} className="max-h-[70%] max-w-[75%] object-contain" />
              ) : (
                <Plus className={cn("size-5", role === "reversed" ? "text-background" : "text-icon", busy === role && "animate-pulse")} strokeWidth={1.7} />
              )}
            </button>
            <div className="mt-2 flex items-center gap-1">
              <span className="flex-1 text-[12px] text-secondary-text">{ROLE_LABEL[role]}</span>
              {logo && (
                <button
                  type="button"
                  aria-label="Remove logo"
                  onClick={() => save({ logos: kit.logos.filter((l) => l.id !== logo.id) })}
                  className="text-icon opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.7} />
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => pick("other")}
          className="flex h-[120px] items-center justify-center gap-1.5 rounded-sm border border-dashed border-placeholder-border text-[13px] font-medium text-link"
        >
          <Plus className="size-4" strokeWidth={1.7} /> Add version
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
    </Card>
  );
}

function ColorsCard({ kit, save }: SaveProps) {
  const [draft, setDraft] = useState("#0071E3");
  return (
    <Card title="Colors" hint="Shown as swatches for text in the editor.">
      <div className="flex flex-wrap gap-4">
        {kit.colors.map((c) => (
          <div key={c} className="group relative flex flex-col items-center gap-1.5">
            <span className="size-12 rounded-full border border-border" style={{ background: c }} />
            <span className="text-[11px] text-secondary-text nums">{c.toUpperCase()}</span>
            <button
              type="button"
              aria-label={`Remove ${c}`}
              onClick={() => save({ colors: kit.colors.filter((x) => x !== c) })}
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-card opacity-0 shadow-segment transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" strokeWidth={1.7} />
            </button>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5">
          <label className="relative flex size-12 cursor-pointer items-center justify-center rounded-full border border-dashed border-placeholder-border text-icon" aria-label="Add a color">
            <Plus className="size-4" strokeWidth={1.7} />
            <input
              type="color"
              value={draft}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => {
                const c = e.target.value.toUpperCase();
                if (!kit.colors.map((x) => x.toUpperCase()).includes(c)) save({ colors: [...kit.colors, c] });
              }}
            />
          </label>
          <span className="text-[11px] text-secondary-text">Add</span>
        </div>
      </div>
    </Card>
  );
}

function FontsCard({ kit, save }: SaveProps) {
  const [weights, setWeights] = useState({ headline: 700, body: 500 });
  const row = (label: string, key: "headline_font" | "body_font", wk: "headline" | "body") => {
    const family = kit[key] ?? DEFAULT_FONT;
    return (
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-control-fill text-[26px]" style={{ fontFamily: `"${family}"`, fontWeight: weights[wk] }}>
          Aa
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-secondary-text">{label}</div>
          <FontPicker
            title={label}
            family={family}
            weight={weights[wk]}
            side="bottom"
            onChange={(f, w) => {
              setWeights((s) => ({ ...s, [wk]: w }));
              void loadFont(f, w);
              if (f !== kit[key]) save({ [key]: f });
            }}
          >
            <button type="button" className="truncate text-[15px] font-medium text-link" style={{ fontFamily: `"${family}"` }}>
              {family}
            </button>
          </FontPicker>
        </div>
      </div>
    );
  };
  return (
    <Card title="Fonts" hint="New headlines and sublines start with these.">
      <div className="space-y-4">
        {row("Headline font", "headline_font", "headline")}
        {row("Body font", "body_font", "body")}
      </div>
    </Card>
  );
}

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
