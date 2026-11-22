import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/admin/AdminShell";
import { listCategories, saveCategoryHint, saveSubcategory } from "@/lib/directory/categories.functions";
import { subcategoriesFor } from "@/lib/directory/subcategories";

const options = queryOptions({ queryKey: ["category-catalog"], queryFn: () => listCategories() });
export const Route = createFileRoute("/_authenticated/admin/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  head: () => ({ meta: [{ title: "Categories — Gravity Pants Admin" }, { name: "description", content: "Edit Aimanté category descriptions." }, { property: "og:title", content: "Categories — Gravity Pants Admin" }, { property: "og:description", content: "Edit Aimanté category descriptions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  errorComponent: ({ reset }) => <div role="alert">Couldn't load categories. <Button variant="plain" onClick={reset}>Try again</Button></div>,
  notFoundComponent: () => <p>Categories not found.</p>,
  component: Categories,
});

function Categories() {
  const { data } = useSuspenseQuery(options);
  const parents = data.filter((c) => c.parent_id === null && c.visibility !== "retired");
  return <><PageTitle title="Categories" /><div className="mb-4"><Button variant="outline" size="sm" asChild><Link to="/admin/directory">Manage brand assignments</Link></Button></div><div className="divide-y divide-border">{parents.map((c) => <section key={c.id} aria-label={`${c.name} category`}><CategoryRow key={`${c.id}:${c.hint}:${c.page_intro}`} category={c} /><Subcategories parent={c} children={subcategoriesFor(data, c.id)} /></section>)}</div></>;
}

type Category = Awaited<ReturnType<typeof listCategories>>[number];
function Subcategories({ parent, children }: { parent: Category; children: { id: string; name: string }[] }) {
  const [adding, setAdding] = useState(false);
  return <div className="mb-5 border-l-2 border-border pl-4 sm:ml-4">
    <div className="mb-2 flex items-center gap-2"><h2 className="text-[13px] font-medium text-secondary-text">Subcategories</h2><Button variant="plain" size="icon" title={`Add subcategory to ${parent.name}`} aria-label={`Add subcategory to ${parent.name}`} onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.7} /></Button></div>
    <div className="grid gap-2">{children.map((child) => <SubcategoryRow key={`${child.id}:${child.name}`} parentId={parent.id} child={child} />)}{adding && <SubcategoryRow parentId={parent.id} onCancel={() => setAdding(false)} onSaved={() => setAdding(false)} />}</div>
  </div>;
}

function SubcategoryRow({ parentId, child, onCancel, onSaved }: { parentId: string; child?: { id: string; name: string }; onCancel?: () => void; onSaved?: () => void }) {
  const [name, setName] = useState(child?.name ?? "");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSubcategory);
  const qc = useQueryClient();
  return <form className="flex max-w-[600px] items-center gap-2" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await save({ data: { parentId, name, ...(child ? { id: child.id } : {}) } }); await qc.invalidateQueries({ queryKey: ["category-catalog"] }); toast.success("Subcategory saved"); onSaved?.(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save subcategory."); }
    finally { setBusy(false); }
  }}><Input className="min-w-0 flex-1" aria-label={child ? `${child.name} subcategory name` : "New subcategory name"} value={name} maxLength={60} placeholder="Subcategory name" onChange={(e) => setName(e.target.value)} /><Button type="submit" size="sm" disabled={busy || !name.trim() || name.trim() === child?.name}>{busy ? "Saving…" : child ? "Save" : "Add"}</Button>{onCancel && <Button variant="plain" size="icon" title="Cancel" aria-label="Cancel new subcategory" onClick={onCancel}><X className="size-4" strokeWidth={1.7} /></Button>}</form>;
}
function CategoryRow({ category }: { category: Awaited<ReturnType<typeof listCategories>>[number] }) {
  const [hint, setHint] = useState(category.hint);
  const [intro, setIntro] = useState(category.page_intro);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveCategoryHint);
  const qc = useQueryClient();
  return <form className="grid gap-3 py-4 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await save({ data: { id: category.id, hint, page_intro: intro } }); await qc.invalidateQueries({ queryKey: ["category-catalog"] }); toast.success("Category saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save category."); }
    finally { setBusy(false); }
  }}><label htmlFor={`hint-${category.id}`} className="text-[14px] font-medium">{category.name}</label><Input id={`hint-${category.id}`} aria-label={`${category.name} description`} value={hint} onChange={(e) => setHint(e.target.value)} /><Button type="submit" size="sm" disabled={busy || (hint.trim() === category.hint && intro.trim() === category.page_intro)}>{busy ? "Saving…" : "Save"}</Button><label htmlFor={`intro-${category.id}`} className="text-[13px] text-secondary-text sm:col-start-1">Page intro on aimante.co</label><Textarea id={`intro-${category.id}`} rows={3} maxLength={600} value={intro} onChange={(e) => setIntro(e.target.value)} className="sm:col-span-2" /></form>;
}