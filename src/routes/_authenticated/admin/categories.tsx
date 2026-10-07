import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/admin/AdminShell";
import { listCategories, saveCategoryHint } from "@/lib/directory/categories.functions";

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
  return <><PageTitle title="Categories" /><div className="divide-y divide-border">{data.map((c) => <CategoryRow key={`${c.id}:${c.hint}`} category={c} />)}</div></>;
}
function CategoryRow({ category }: { category: Awaited<ReturnType<typeof listCategories>>[number] }) {
  const [hint, setHint] = useState(category.hint);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveCategoryHint);
  const qc = useQueryClient();
  return <form className="grid gap-3 py-4 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await save({ data: { id: category.id, hint } }); await qc.invalidateQueries({ queryKey: ["category-catalog"] }); toast.success("Category saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save category."); }
    finally { setBusy(false); }
  }}><label htmlFor={`hint-${category.id}`} className="text-[14px] font-medium">{category.name}</label><Input id={`hint-${category.id}`} aria-label={`${category.name} description`} value={hint} onChange={(e) => setHint(e.target.value)} /><Button type="submit" size="sm" disabled={busy || hint.trim() === category.hint}>{busy ? "Saving…" : "Save"}</Button></form>;
}