import { useEffect, useRef, useState } from "react";
import { openUpgrade } from "@/lib/stillframe/plan";
import { Link } from "@tanstack/react-router";
import { Copy, MoreHorizontal, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FontPicker } from "@/components/stillframe/FontPicker";
import { MediaImage } from "@/components/stillframe/MediaImage";
import {
  useBrandKits,
  useCanEditKits,
  useDeleteBrandKit,
  useKitsEnabled,
  useSaveBrandKit,
  useSetDefaultKit,
  type KitDraft,
} from "@/lib/stillframe/data";
import { loadFont } from "@/lib/stillframe/fonts";
import { uploadBrandAsset } from "@/lib/stillframe/media";
import type { NamedBrandKit } from "@/lib/stillframe/types";
import { DEFAULT_FONT } from "@/render/renderFrame";
import { cn } from "@/lib/utils";

const EMPTY: KitDraft = { name: "", logo_url: null, logo_dark_url: null, colors: [], headline_font: null, subline_font: null };
const toDraft = (k: NamedBrandKit): KitDraft => ({
  name: k.name,
  logo_url: k.logo_url,
  logo_dark_url: k.logo_dark_url,
  colors: k.colors,
  headline_font: k.headline_font,
  subline_font: k.subline_font,
});

export function BrandKitsSection() {
  const { data: enabled, isLoading: loadingPlan } = useKitsEnabled();
  const { data: canEdit = false } = useCanEditKits();
  const { data: kits = [], isLoading } = useBrandKits();
  const save = useSaveBrandKit();
  const remove = useDeleteBrandKit();
  const setDefault = useSetDefaultKit();
  const [editing, setEditing] = useState<{ id?: string; draft: KitDraft } | null>(null);
  const [deleting, setDeleting] = useState<NamedBrandKit | null>(null);

  if (loadingPlan) return <p className="text-[13px] text-secondary-text">Loading your brand kits…</p>;

  if (!enabled) {
    return (
      <section className="rounded-sm bg-card p-6 shadow-card">
        <h2 className="text-[17px] font-semibold">Brand kits come with a paid plan</h2>
        <p className="mt-1 max-w-[520px] text-[14px] text-secondary-text">
          Save your logos, colors and fonts as kits and put them on any ad in one tap. On the Team plan everyone in your team shares them.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="h-11 lg:h-9" onClick={() => openUpgrade("brand_kits")}><Plus strokeWidth={1.7} /> New kit</Button>
          <Button asChild variant="plain" className="h-11 lg:h-9"><Link to="/pricing">See plans</Link></Button>
        </div>
      </section>
    );
  }

  const fail = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-[17px] font-semibold">Your kits</h2>
        {canEdit && (
          <Button className="ml-auto" onClick={() => setEditing({ draft: { ...EMPTY, name: kits.length ? `Brand kit ${kits.length + 1}` : "My brand" } })}>
            <Plus strokeWidth={1.7} /> New kit
          </Button>
        )}
      </div>
      {!canEdit && <p className="mt-1 text-[13px] text-secondary-text">You can use these kits on your ads. Owners and admins can change them.</p>}

      {isLoading ? (
        <p className="mt-4 text-[13px] text-secondary-text">Loading…</p>
      ) : kits.length === 0 ? (
        <div className="mt-4 rounded-sm border border-dashed border-placeholder-border p-8 text-center text-[14px] text-secondary-text">
          {canEdit ? "No kits yet. Make one with your logo, colors and fonts." : "No kits yet."}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((k) => (
            <KitCard
              key={k.id}
              kit={k}
              canEdit={canEdit}
              onEdit={() => setEditing({ id: k.id, draft: toDraft(k) })}
              onDuplicate={() =>
                save.mutate({ draft: { ...toDraft(k), name: `${k.name} copy` } }, { onSuccess: () => toast("Kit duplicated"), onError: fail })
              }
              onDefault={() => setDefault.mutate(k.id, { onSuccess: () => toast(`New ads will start with ${k.name}`), onError: fail })}
              onDelete={() => setDeleting(k)}
            />
          ))}
        </div>
      )}

      {editing && (
        <KitEditor
          initial={editing.draft}
          isNew={!editing.id}
          busy={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(draft) =>
            save.mutate(
              { id: editing.id, draft },
              {
                onSuccess: () => {
                  toast(editing.id ? "Kit saved" : "Kit created");
                  setEditing(null);
                },
                onError: fail,
              },
            )
          }
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>Ads using this kit keep their current logo, colors and fonts.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => toast("Kit deleted"), onError: fail })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function KitCard({
  kit,
  canEdit,
  onEdit,
  onDuplicate,
  onDefault,
  onDelete,
}: {
  kit: NamedBrandKit;
  canEdit: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDefault: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (kit.headline_font) void loadFont(kit.headline_font, 700);
    if (kit.subline_font) void loadFont(kit.subline_font, 500);
  }, [kit.headline_font, kit.subline_font]);
  return (
    <article className="flex flex-col rounded-sm bg-card shadow-card">
      <button
        type="button"
        onClick={canEdit ? onEdit : undefined}
        className={cn("flex h-[120px] items-center justify-center rounded-t-sm bg-control-fill", !canEdit && "cursor-default")}
        aria-label={canEdit ? `Edit ${kit.name}` : kit.name}
      >
        {kit.logo_url || kit.logo_dark_url ? (
          <MediaImage path={(kit.logo_url ?? kit.logo_dark_url)!} alt={`${kit.name} logo`} className="max-h-[60%] max-w-[70%] object-contain" />
        ) : (
          <span className="text-[13px] text-secondary-text">No logo</span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{kit.name}</h3>
          {kit.is_default && <span className="rounded-lg bg-control-fill px-2 py-0.5 text-[11px] font-medium text-secondary-text">Default</span>}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`More for ${kit.name}`} className="-mr-2 flex size-11 items-center justify-center text-icon">
                  <MoreHorizontal className="size-4" strokeWidth={1.7} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}><Pencil strokeWidth={1.7} /> Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}><Copy strokeWidth={1.7} /> Duplicate</DropdownMenuItem>
                {!kit.is_default && <DropdownMenuItem onSelect={onDefault}><Star strokeWidth={1.7} /> Set as default</DropdownMenuItem>}
                <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 strokeWidth={1.7} /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {kit.colors.length ? (
            kit.colors.slice(0, 8).map((c) => <span key={c} className="size-5 rounded-full border border-border" style={{ background: c }} title={c} />)
          ) : (
            <span className="text-[12px] text-secondary-text">No colors</span>
          )}
        </div>
        <div className="flex items-end gap-4">
          <FontSample label="Headline" family={kit.headline_font} weight={700} />
          <FontSample label="Subline" family={kit.subline_font} weight={500} />
        </div>
      </div>
    </article>
  );
}

function FontSample({ label, family, weight }: { label: string; family: string | null; weight: number }) {
  const f = family ?? DEFAULT_FONT;
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[24px] leading-none" style={{ fontFamily: `"${f}"`, fontWeight: weight }}>Aa</div>
      <div className="mt-1 truncate text-[11px] text-secondary-text">{label} · {f}</div>
    </div>
  );
}

function KitEditor({
  initial,
  isNew,
  busy,
  onClose,
  onSave,
}: {
  initial: KitDraft;
  isNew: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (d: KitDraft) => void;
}) {
  const [draft, setDraft] = useState<KitDraft>(initial);
  const [color, setColor] = useState("#0071E3");
  const set = (p: Partial<KitDraft>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-[560px] overflow-y-auto rounded-sm p-5 sm:p-6">
        <DialogTitle className="text-[17px] font-semibold">{isNew ? "New brand kit" : "Edit brand kit"}</DialogTitle>

        <label className="mt-2 block space-y-1.5">
          <span className="text-[12px] text-secondary-text">Name</span>
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} className="h-11 text-[16px] lg:text-[14px]" />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <LogoSlot label="Logo" hint="For light photos" path={draft.logo_url} dark={false} onChange={(p) => set({ logo_url: p })} />
          <LogoSlot label="Logo for dark photos" hint="Usually a white version" path={draft.logo_dark_url} dark onChange={(p) => set({ logo_dark_url: p })} />
        </div>

        <div className="mt-4 space-y-2">
          <span className="text-[12px] text-secondary-text">Colors</span>
          <div className="flex flex-wrap items-center gap-2">
            {draft.colors.map((c) => (
              <span key={c} className="flex h-11 items-center gap-1.5 rounded-lg bg-control-fill pl-2 pr-1 text-[12px] nums">
                <span className="size-5 rounded-full border border-border" style={{ background: c }} />
                {c}
                <button type="button" aria-label={`Remove ${c}`} onClick={() => set({ colors: draft.colors.filter((x) => x !== c) })} className="flex size-9 items-center justify-center text-icon">
                  <X className="size-3.5" strokeWidth={1.7} />
                </button>
              </span>
            ))}
            <label className="relative flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-placeholder-border px-3 text-[13px] font-medium text-link">
              <Plus className="size-4" strokeWidth={1.7} /> Add color
              <input
                type="color"
                value={color}
                aria-label="Add a color"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => setColor(e.target.value)}
                onBlur={(e) => {
                  const c = e.target.value.toUpperCase();
                  if (!draft.colors.includes(c)) set({ colors: [...draft.colors, c] });
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FontField label="Headline font" family={draft.headline_font} weight={700} onChange={(f) => set({ headline_font: f })} />
          <FontField label="Subline font" family={draft.subline_font} weight={500} onChange={(f) => set({ subline_font: f })} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !draft.name.trim()} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>
            {busy ? "Saving…" : isNew ? "Create kit" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogoSlot({ label, hint, path, dark, onChange }: { label: string; hint: string; path: string | null; dark: boolean; onChange: (p: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn("flex h-[110px] w-full items-center justify-center rounded-sm", dark ? "bg-foreground" : "bg-control-fill", !path && "border border-dashed border-placeholder-border")}
        aria-label={path ? `Replace ${label}` : `Add ${label}`}
      >
        {path ? (
          <MediaImage path={path} alt={label} className="max-h-[65%] max-w-[75%] object-contain" />
        ) : (
          <Plus className={cn("size-5", dark ? "text-background" : "text-icon", busy && "animate-pulse")} strokeWidth={1.7} />
        )}
      </button>
      <div className="mt-1.5 flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium">{label}</div>
          <div className="text-[11px] text-secondary-text">{hint}</div>
        </div>
        {path && (
          <button type="button" aria-label={`Remove ${label}`} onClick={() => onChange(null)} className="flex size-11 items-center justify-center text-icon">
            <Trash2 className="size-3.5" strokeWidth={1.7} />
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            onChange(await uploadBrandAsset(f));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "That logo couldn't be uploaded.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function FontField({ label, family, weight, onChange }: { label: string; family: string | null; weight: number; onChange: (f: string) => void }) {
  const f = family ?? DEFAULT_FONT;
  return (
    <div className="flex items-center gap-3 rounded-sm bg-control-fill p-2">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-card text-[20px]" style={{ fontFamily: `"${f}"`, fontWeight: weight }}>Aa</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-secondary-text">{label}</div>
        <FontPicker
          title={label}
          family={f}
          weight={weight}
          side="bottom"
          onChange={(fam, w) => {
            void loadFont(fam, w);
            onChange(fam);
          }}
        >
          <button type="button" className="h-8 max-w-full truncate text-[14px] font-medium text-link">{f}</button>
        </FontPicker>
      </div>
    </div>
  );
}
