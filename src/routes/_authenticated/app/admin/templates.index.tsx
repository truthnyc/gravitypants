import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Archive, Copy, EyeOff, GripVertical, Lock, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fmtDate, PageTitle } from "@/components/admin/AdminShell";
import { MediaImage } from "@/components/stillframe/MediaImage";
import { adminTemplateAction, adminTemplateCreate, adminTemplateList, adminTemplateReorder } from "@/lib/stillframe/admin-templates.functions";
import { docDuration, PLAN_AUDIENCE } from "@/lib/stillframe/template-doc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/templates/")({
  head: () => ({ meta: [
    { title: "Templates — Gravity Pants Admin" },
    { name: "description", content: "Manage the ready-made templates every customer sees." },
    { property: "og:title", content: "Templates — Gravity Pants Admin" },
    { property: "og:description", content: "Manage the ready-made templates every customer sees." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminTemplates,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;
type Filter = "all" | "published" | "draft" | "archived";
export const adminTemplatesKey = ["admin", "templates"] as const;
const RATIO: Record<string, [number, number]> = { "9:16": [20, 36], "1:1": [34, 34], "16:9": [40, 23] };

export function audienceLabel(a: string[] | null | undefined) {
  if (!a?.length) return "All users";
  return PLAN_AUDIENCE.filter(([k]) => a.includes(k)).map(([, l]) => l).join(", ");
}

function Updated({ at }: { at: string }) {
  const d = new Date(at);
  const today = new Date();
  const y = new Date(today.getTime() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return <>Today, {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</>;
  if (same(d, y)) return <>Yesterday</>;
  return <>{fmtDate(at)}</>;
}

export function TemplateThumb({ row, size = 48 }: { row: Row; size?: number }) {
  const [w, h] = RATIO[row.format ?? "9:16"] ?? [20, 36];
  const k = size / 48;
  const thumb: string | null = row.draft?.thumbnail_url ?? row.thumbnail_url;
  const bg = row.draft?.style?.background_color ?? row.style?.background_color ?? "#1D1D1F";
  return (
    <div className="flex shrink-0 items-center justify-center rounded-sm bg-canvas" style={{ width: size, height: size }}>
      <span className="relative block overflow-hidden rounded-[2px]" style={{ width: w * k, height: h * k, background: bg }}>
        {thumb && !thumb.startsWith("/") && <MediaImage path={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = {
    published: ["Published", "bg-success-soft text-success-text", "bg-success-text"],
    draft: ["Draft", "bg-warning-soft text-warning-text", "bg-warning-text"],
    archived: ["Archived", "bg-control-fill text-secondary-text", "bg-secondary-text"],
  }[status] ?? [status, "bg-control-fill", "bg-secondary-text"];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium", s[1])}>
      <span className={cn("size-1.5 rounded-full", s[2])} />
      {s[0]}
    </span>
  );
}

function AdminTemplates() {
  const list = useServerFn(adminTemplateList);
  const create = useServerFn(adminTemplateCreate);
  const act = useServerFn(adminTemplateAction);
  const reorder = useServerFn(adminTemplateReorder);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useQuery({ queryKey: adminTemplatesKey, queryFn: () => list() });
  const [filter, setFilter] = useState<Filter>("all");
  const [format, setFormat] = useState("all");
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  const ordered = useMemo(() => {
    const ids = order ?? rows.map((r: Row) => r.id);
    const byId = new Map(rows.map((r: Row) => [r.id, r]));
    const list = ids.map((id) => byId.get(id)).filter(Boolean) as Row[];
    // Archived sit at the bottom, like the users never see them.
    return [...list.filter((r) => r.status !== "archived"), ...list.filter((r) => r.status === "archived")];
  }, [rows, order]);

  const count = (f: Filter) => (f === "all" ? rows.length : rows.filter((r: Row) => r.status === f).length);
  const shown = ordered.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (format === "all" || r.format === format) &&
      (!q.trim() || `${r.name} ${r.slug}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const canDrag = filter === "all" && format === "all" && !q.trim();

  const refresh = () => qc.invalidateQueries({ queryKey: adminTemplatesKey }).then(() => qc.invalidateQueries({ queryKey: ["templates"] }));
  async function run(id: string, action: Parameters<typeof act>[0]["data"]["action"], done: string) {
    try {
      const r = await act({ data: { id, action } });
      toast(done);
      await refresh();
      if (action === "duplicate" && r.id) void navigate({ to: "/app/admin/templates/$id", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
  }
  async function newTemplate() {
    try {
      const { id } = await create();
      await refresh();
      void navigate({ to: "/app/admin/templates/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
  }
  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = ordered.map((r) => r.id);
    const from = ids.indexOf(dragId);
    ids.splice(from, 1);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    setOrder(ids);
    setDragId(null);
    try {
      await reorder({ data: { ids } });
      await refresh();
      setOrder(null);
      toast("Order saved");
    } catch {
      setOrder(null);
      toast.error("The new order didn't save");
    }
  }

  return (
    <>
      <p className="mb-1 text-[13px] text-secondary-text">Content › Templates</p>
      <PageTitle
        title="Templates"
        sub={"Global templates appear for every user under the \u201cGravity Pants\u201d tab. Drag rows to set their order."}
        right={<Button size="header" onClick={() => void newTemplate()}><Plus className="size-4" strokeWidth={1.7} /> New template</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(["all", "published", "draft", "archived"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium", filter === f ? "bg-foreground text-background" : "text-foreground hover:bg-control-fill")}
            >
              {{ all: "All", published: "Published", draft: "Drafts", archived: "Archived" }[f]}
              <span className={cn("nums text-[12px] font-semibold", filter === f ? "text-background/70" : "text-secondary-text")}>{count(f)}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <select value={format} onChange={(e) => setFormat(e.target.value)} aria-label="Format" className="h-9 rounded-sm bg-card px-3 text-[13px] shadow-card">
            <option value="all">All formats</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
          <label className="flex h-9 items-center gap-2 rounded-sm bg-card px-3 shadow-card">
            <Search className="size-4 text-icon" strokeWidth={1.7} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" className="w-[180px] bg-transparent text-[13px] outline-none" />
          </label>
        </div>
      </div>

      <section className="overflow-x-auto rounded-sm bg-card shadow-card">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-secondary-text">
              {["", "", "Name", "Format", "Slides", "Status", "Audience", "Featured", "Updated", ""].map((h, i) => (
                <th key={i} className="h-9 whitespace-nowrap px-3 font-medium hairline-b">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="p-5 text-secondary-text">Loading…</td></tr>}
            {!isLoading && !shown.length && <tr><td colSpan={10} className="p-5 text-secondary-text">No templates match.</td></tr>}
            {shown.map((r) => {
              const slides = r.slides ?? [];
              const archived = r.status === "archived";
              return (
                <tr
                  key={r.id}
                  draggable={canDrag && !archived}
                  onDragStart={() => setDragId(r.id)}
                  onDragOver={(e) => canDrag && !archived && e.preventDefault()}
                  onDrop={() => void drop(r.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn("h-[66px] border-b border-border/60 hover:bg-canvas/60", dragId === r.id && "opacity-50")}
                >
                  <td className="w-8 px-3 text-icon">{canDrag && !archived && <GripVertical className="size-4 cursor-grab" strokeWidth={1.7} aria-label="Drag to reorder" />}</td>
                  <td className={cn("w-[60px] px-1", archived && "opacity-50")}><TemplateThumb row={r} /></td>
                  <td className={cn("px-3", archived && "opacity-50")}>
                    <div className="flex items-center gap-2">
                      <Link to="/app/admin/templates/$id" params={{ id: r.id }} className="text-[14px] font-semibold hover:underline">{r.name}</Link>
                      {r.is_reusable && <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[11px] font-semibold text-primary">Reusable</span>}
                      {r.draft && r.status === "published" && <span className="inline-flex h-5 items-center rounded-full bg-warning-soft px-2 text-[11px] font-semibold text-warning-text">Unpublished edits</span>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-secondary-text">/{r.slug} · {r.version > 0 && r.status !== "draft" ? `v${r.version}` : r.version > 0 ? `v${r.version} · unpublished` : "not published"}</p>
                  </td>
                  <td className={cn("nums px-3", archived && "opacity-50")}>{r.format}</td>
                  <td className={cn("nums whitespace-nowrap px-3", archived && "opacity-50")}>{slides.length} · {docDuration({ slides }).toFixed(1)}s</td>
                  <td className={cn("px-3", archived && "opacity-50")}><StatusPill status={r.status} /></td>
                  <td className={cn("whitespace-nowrap px-3", archived && "opacity-50")}>
                    {r.status === "draft" && !r.version ? "—" : r.audience?.length ? <span className="inline-flex items-center gap-1"><Lock className="size-3.5 text-icon" strokeWidth={1.7} />{audienceLabel(r.audience)}</span> : "All users"}
                  </td>
                  <td className="px-3">
                    <button
                      type="button"
                      disabled={archived}
                      onClick={() => void run(r.id, r.featured ? "unfeature" : "feature", r.featured ? "No longer featured" : "Featured")}
                      aria-label={r.featured ? `Unfeature ${r.name}` : `Feature ${r.name}`}
                      className="flex size-9 items-center justify-center rounded-lg hover:bg-control-fill disabled:opacity-40"
                    >
                      <Star className={cn("size-4", r.featured ? "fill-warning-text text-warning-text" : "text-icon")} strokeWidth={1.7} />
                    </button>
                  </td>
                  <td className={cn("nums whitespace-nowrap px-3 text-secondary-text", archived && "opacity-50")}><Updated at={r.updated_at} /></td>
                  <td className="px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label={`More for ${r.name}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-control-fill"><MoreHorizontal className="size-4" strokeWidth={1.7} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => void navigate({ to: "/app/admin/templates/$id", params: { id: r.id } })}><Pencil className="size-4" strokeWidth={1.7} /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void run(r.id, "duplicate", "Duplicated as a draft")}><Copy className="size-4" strokeWidth={1.7} /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void navigate({ to: "/app/templates/$slug", params: { slug: r.slug } })}><Play className="size-4" strokeWidth={1.7} /> Preview</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {r.status === "published" && <DropdownMenuItem onSelect={() => void run(r.id, "unpublish", "Unpublished")}><EyeOff className="size-4" strokeWidth={1.7} /> Unpublish</DropdownMenuItem>}
                        {r.status !== "archived" ? (
                          <DropdownMenuItem onSelect={() => void run(r.id, "archive", "Archived")}><Archive className="size-4" strokeWidth={1.7} /> Archive</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => void run(r.id, "restore", "Restored as a draft")}><RotateCcw className="size-4" strokeWidth={1.7} /> Restore</DropdownMenuItem>
                        )}
                        {r.status !== "published" && (
                          <DropdownMenuItem className="text-destructive" onSelect={() => { if (confirm(`Delete \u201c${r.name}\u201d? This can't be undone.`)) void run(r.id, "delete", "Deleted"); }}>
                            <Trash2 className="size-4" strokeWidth={1.7} /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="mt-3 text-[13px] text-secondary-text">
        Order here = order users see. Featured templates are pinned first. Archived templates are hidden from users; ads already made from them are not affected.
      </p>
    </>
  );
}
