import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStorageUsage } from "@/components/billing/StorageCard";
import { deleteStorageFiles } from "@/lib/stillframe/storage.functions";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { formatGB } from "@/lib/stillframe/storage-limits";

export const Route = createFileRoute("/_authenticated/app/storage")({
  head: () => ({
    meta: [
      { title: "Free up space — Gravity Pants" },
      { name: "description", content: "See your largest photos and exports and delete what you no longer need." },
      { property: "og:title", content: "Free up space — Gravity Pants" },
      { property: "og:description", content: "Review and delete old photos and exports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoragePage,
});

const KIND: Record<string, string> = { photo: "Photo", exports: "Export", logo: "Logo", directory: "Published reel", templates: "Template", shopify: "Shopify" };
const size = (b: number) => (b >= 1024 ** 3 ? formatGB(b) : `${(b / 1024 ** 2).toFixed(1)} MB`);

function StoragePage() {
  const { data, isLoading } = useStorageUsage();
  const del = useServerFn(deleteStorageFiles);
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const pickedBytes = (data?.files ?? []).filter((f) => picked.has(f.name)).reduce((n, f) => n + f.bytes, 0);

  const remove = async () => {
    if (!window.confirm(`Delete ${picked.size} file${picked.size === 1 ? "" : "s"}? This can't be undone.`)) return;
    setBusy(true);
    try {
      const r = await del({ data: { workspaceId: await getWorkspaceId(), names: [...picked] } });
      if ("error" in r) throw new Error(r.error);
      toast.success(`Freed ${size(pickedBytes)}.`);
      setPicked(new Set());
      await qc.invalidateQueries({ queryKey: ["storage-usage"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[780px] flex-col gap-4 px-4 pb-20 pt-9 sm:px-6">
      <div>
        <h1 className="text-[28px] font-semibold">Free up space</h1>
        {data && (
          <p className="mt-1 text-[14px] text-secondary-text nums">
            {formatGB(data.used)} of {formatGB(data.limit)} used. Files still used by an ad or a published reel are kept.{" "}
            <Link to="/app/account/billing" hash="storage" className="text-primary">Add storage instead</Link>
          </p>
        )}
      </div>
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-sm border border-border bg-card p-3">
        <span className="text-[14px] nums">{picked.size ? `${picked.size} selected · ${size(pickedBytes)}` : "Select files to delete"}</span>
        <Button variant="destructive" disabled={!picked.size || busy} onClick={() => void remove()}>Delete</Button>
      </div>
      {isLoading && <p className="text-[14px] text-secondary-text">Loading…</p>}
      <ul className="divide-y divide-border rounded-sm border border-border bg-card">
        {(data?.files ?? []).map((f) => (
          <li key={f.name} className="flex items-center gap-3 p-3">
            <input
              type="checkbox"
              aria-label={`Select ${f.name.split("/").pop()}`}
              disabled={f.in_use}
              checked={picked.has(f.name)}
              onChange={(e) => {
                const n = new Set(picked);
                if (e.target.checked) n.add(f.name); else n.delete(f.name);
                setPicked(n);
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px]">{f.name.split("/").pop()}</p>
              <p className="text-[12px] text-secondary-text nums">
                {KIND[f.kind] ?? "File"} · {new Date(f.created_at).toLocaleDateString()}
              </p>
            </div>
            {f.in_use && <span className="rounded-lg bg-control-fill px-2 py-0.5 text-[12px] text-secondary-text">In use</span>}
            <span className="w-20 text-right text-[13px] nums">{size(f.bytes)}</span>
          </li>
        ))}
        {data && !data.files.length && <li className="p-6 text-center text-[14px] text-secondary-text">No files yet.</li>}
      </ul>
    </main>
  );
}
