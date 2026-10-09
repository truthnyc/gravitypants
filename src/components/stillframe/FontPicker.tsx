import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBrandKit, useUpdateBrandKit } from "@/lib/stillframe/data";
import {
  POPULAR,
  WEIGHT_NAMES,
  categoryLabel,
  closestWeight,
  loadFont,
  loadFontPreview,
  recentFonts,
  rememberFont,
  scriptsOf,
  registerCustomFonts,
  useFontList,
  weightsOf,
  type FontCategory,
  type WebFont,
} from "@/lib/stillframe/fonts";
import { uploadMedia } from "@/lib/stillframe/media";
import { cn } from "@/lib/utils";

const CHIPS: { value: FontCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "serif", label: "Serif" },
  { value: "sans-serif", label: "Sans serif" },
  { value: "display", label: "Display" },
  { value: "handwriting", label: "Handwriting" },
  { value: "monospace", label: "Mono" },
];

type Row = { kind: "header"; label: string } | { kind: "font"; font: WebFont };
const ROW_H = 44;
const HEADER_H = 30;

export function FontPicker({
  title,
  family,
  weight,
  onChange,
  side = "left",
  children,
  onPreview,
  sampleText = "",
  brandName = "Brand",
}: {
  onPreview?: (family: string | null, weight: number) => void;
  sampleText?: string;
  brandName?: string;
  title: string;
  family: string;
  weight: number;
  onChange: (family: string, weight: number) => void;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<FontCategory>("all");
  const [active, setActive] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data } = useFontList();
  const { data: kit } = useBrandKit();
  const updateKit = useUpdateBrandKit();

  const custom: WebFont[] = useMemo(
    () => (kit?.custom_fonts ?? []).map((f) => ({ family: f.family, category: "custom", variants: ["regular"] })),
    [kit?.custom_fonts],
  );
  const all = useMemo(() => [...custom, ...(data?.fonts ?? [])], [custom, data?.fonts]);
  const byName = useMemo(() => new Map(all.map((f) => [f.family, f])), [all]);

  useEffect(() => {
    if (kit?.custom_fonts.length) void registerCustomFonts(kit.custom_fonts);
  }, [kit?.custom_fonts]);

  const needs = useMemo(() => scriptsOf(sampleText), [sampleText]);
  const [recentList, setRecentList] = useState<string[]>([]);
  useEffect(() => { if (open) setRecentList(recentFonts()); }, [open]);
  const preview = (font: WebFont | null) => {
    if (!onPreview) return;
    if (!font) return onPreview(null, weight);
    const w = closestWeight(weightsOf(font), weight);
    void loadFont(font.family, w);
    onPreview(font.family, w);
  };
  const setOpenAndRestore = (v: boolean) => {
    if (!v) onPreview?.(null, weight);
    setOpen(v);
  };

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (f: WebFont) =>
      (cat === "all" || f.category === cat) && (!q || f.family.toLowerCase().includes(q)) && (!needs.length || f.category === "custom" || !f.subsets || needs.every((n) => f.subsets!.includes(n)));
    const brand = [kit?.headline_font, kit?.body_font, ...custom.map((c) => c.family)]
      .filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i)
      .map((n) => byName.get(n) ?? { family: n, category: "sans-serif", variants: ["regular", "700"] })
      .filter(match);
    const popular = POPULAR.map((n) => byName.get(n)).filter((f): f is WebFont => Boolean(f) && match(f!));
    const recent = q ? [] : recentList.map((n) => byName.get(n)).filter((f): f is WebFont => Boolean(f) && match(f!));
    const rest = all.filter((f) => f.category !== "custom" && match(f));
    const out: Row[] = [];
    if (brand.length) out.push({ kind: "header", label: `${brandName} brand fonts` }, ...brand.map((font) => ({ kind: "font" as const, font })));
    if (recent.length) out.push({ kind: "header", label: "Recently used" }, ...recent.map((font) => ({ kind: "font" as const, font })));
    if (popular.length && !q) out.push({ kind: "header", label: "Popular for ads" }, ...popular.map((font) => ({ kind: "font" as const, font })));
    if (rest.length) out.push({ kind: "header", label: q ? "Results" : "All fonts" }, ...rest.map((font) => ({ kind: "font" as const, font })));
    return out;
  }, [query, cat, kit, custom, byName, all, needs, recentList, brandName]);

  // offsets for the virtualized list
  const offsets = useMemo(() => {
    let y = 0;
    return rows.map((r) => {
      const at = y;
      y += r.kind === "header" ? HEADER_H : ROW_H;
      return at;
    });
  }, [rows]);
  const totalH = rows.length ? offsets[offsets.length - 1]! + (rows[rows.length - 1]!.kind === "header" ? HEADER_H : ROW_H) : 0;
  const viewH = 400;
  const visible = rows
    .map((r, i) => ({ r, i, y: offsets[i]! }))
    .filter(({ y }) => y + ROW_H >= scrollTop - 200 && y <= scrollTop + viewH + 200);
  const fontIdx = rows.map((r, i) => (r.kind === "font" ? i : -1)).filter((i) => i >= 0);

  useEffect(() => {
    for (const { r } of visible) if (r.kind === "font") loadFontPreview(r.font.family);
  });

  useEffect(() => {
    if (!open) return;
    const sel = rows.findIndex((r) => r.kind === "font" && r.font.family === family);
    setActive(sel >= 0 ? sel : (fontIdx[0] ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, cat]);

  const scrollTo = (i: number) => {
    const el = listRef.current;
    const y = offsets[i];
    if (!el || y === undefined) return;
    if (y < el.scrollTop) el.scrollTop = y - HEADER_H;
    else if (y + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = y + ROW_H - el.clientHeight;
  };

  const choose = (font: WebFont) => {
    const w = closestWeight(weightsOf(font), weight);
    onPreview?.(null, weight);
    rememberFont(font.family);
    void loadFont(font.family, w).then(() => onChange(font.family, w));
    onChange(font.family, w);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const pos = fontIdx.indexOf(active);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = fontIdx[Math.max(0, Math.min(fontIdx.length - 1, pos + (e.key === "ArrowDown" ? 1 : -1)))];
      if (next !== undefined) {
        setActive(next);
        scrollTo(next);
        const r = rows[next];
        if (r?.kind === "font") preview(r.font);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = rows[active];
      if (r?.kind === "font") choose(r.font);
    }
  };

  const current = byName.get(family);
  const weights = weightsOf(current);

  const upload = async (file: File) => {
    if (!/\.(woff2?|otf|ttf)$/i.test(file.name)) {
      toast.error("Choose a .woff2, .otf or .ttf font file.");
      return;
    }
    try {
      const up = await uploadMedia(file, "font");
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const next = [...(kit?.custom_fonts ?? []).filter((f) => f.family !== name), { family: name, path: up.path }];
      await updateKit.mutateAsync({ custom_fonts: next });
      await registerCustomFonts(next);
      onChange(name, 400);
      toast(`${name} added to your Brand Kit`);
    } catch {
      toast.error("That font couldn't be uploaded. Try again.");
    }
  };

  const content = <>
        <div className="px-4 pb-3 pt-4">
          {isMobile ? <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><DrawerTitle className="min-w-0 text-[15px] font-semibold">{title}</DrawerTitle><DrawerClose asChild><Button variant="ghost" size="sm">Done</Button></DrawerClose></div> : <div className="text-[15px] font-semibold">{title}</div>}
          {needs.length > 0 && <div className="text-[12px] text-secondary-text">Showing fonts that support your text</div>}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-icon" strokeWidth={1.7} />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                listRef.current?.scrollTo({ top: 0 });
              }}
              placeholder="Search Google Fonts…"
              aria-label="Search fonts"
              className="h-8 w-full rounded-sm bg-control-fill pl-8 pr-2 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <Button
                variant="plain"
                key={c.value}
                type="button"
                onClick={() => setCat(c.value)}
                className={cn(
                  "h-6 rounded-lg px-2.5 text-[12px] font-medium",
                  cat === c.value ? "bg-foreground text-background" : "bg-control-fill",
                )}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label="Fonts"
          className="relative min-h-0 flex-1 overflow-y-auto border-t"
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          onMouseLeave={() => preview(null)}
        >
          {rows.length === 0 && <p className="p-6 text-center text-[13px] text-secondary-text">No fonts match “{query}”.</p>}
          <div style={{ height: totalH }} className="relative">
            {visible.map(({ r, i, y }) =>
              r.kind === "header" ? (
                <div
                  key={`h-${r.label}`}
                  className="absolute inset-x-0 flex items-end px-4 pb-1 text-[11px] font-semibold tracking-[0.06em] text-secondary-text"
                  style={{ top: y, height: HEADER_H }}
                >
                  {r.label.toUpperCase()}
                </div>
              ) : (
                 <Button
                  key={`${i}-${r.font.family}`}
                  type="button"
                  role="option"
                  aria-selected={r.font.family === family}
                  onMouseEnter={() => { setActive(i); preview(r.font); }}
                  onClick={() => choose(r.font)}
                   variant="ghost"
                   className={cn("absolute inset-x-0 flex justify-start items-center gap-2 rounded-none px-4 text-left", active === i && "bg-control-fill")}
                  style={{ top: y, height: ROW_H }}
                >
                  <span className="min-w-0 flex-1 truncate text-[17px]" style={{ fontFamily: `"${r.font.family}", var(--font-sans)` }}>
                    {r.font.family}
                  </span>
                  <span className="text-[11px] text-secondary-text">{categoryLabel(r.font.category)}</span>
                  <Check className={cn("size-4 text-primary", r.font.family !== family && "invisible")} strokeWidth={1.7} />
                 </Button>
              ),
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t px-4 pt-2 text-[11px] text-secondary-text nums">
          <span>{(data?.fonts.length ?? 0).toLocaleString()} fonts · free for commercial use ·</span>
          <a href="https://fonts.google.com" target="_blank" rel="noreferrer" className="text-link">Google Fonts ↗</a>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-link"
          >
            <Upload className="size-3.5" strokeWidth={1.7} /> Upload a font…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".woff2,.woff,.otf,.ttf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <div className="ml-auto w-[128px]">
            <Select
              value={String(weights.includes(weight) ? weight : closestWeight(weights, weight))}
              onValueChange={(v) => {
                const w = Number(v);
                void loadFont(family, w).then(() => onChange(family, w));
                onChange(family, w);
              }}
            >
              <SelectTrigger className="h-8 rounded-sm text-[12px]" aria-label="Weight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weights.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {WEIGHT_NAMES[w] ?? w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </>;
  if (isMobile) return (
    <Drawer open={open} onOpenChange={setOpenAndRestore} shouldScaleBackground={false} autoFocus>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent aria-describedby={undefined} className="h-[85dvh] gap-0" onKeyDown={onKey}>
        {content}
      </DrawerContent>
    </Drawer>
  );
  return (
    <Popover open={open} onOpenChange={setOpenAndRestore}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" sideOffset={12} className="flex h-[600px] w-[340px] flex-col gap-0 rounded-lg p-0 shadow-popover" onKeyDown={onKey}>
        {content}
      </PopoverContent>
    </Popover>
  );
}
