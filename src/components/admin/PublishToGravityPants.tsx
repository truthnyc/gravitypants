import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/lib/stillframe/admin.functions";
import { listDirectoryBrands } from "@/lib/directory/directory.functions";
import { adminPublishAd } from "@/lib/stillframe/admin-publish.functions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Staff-only studio action. Shown only to admins; the server re-checks the role. */
export function PublishToGravityPants({ projectId }: { projectId: string }) {
  const check = useServerFn(checkAdmin);
  const { data } = useQuery({
    queryKey: ["is-admin", "global-template"],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return { admin: false };
      return check().catch(() => ({ admin: false }));
    },
    staleTime: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  if (!data?.admin) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 border-t border-ap-hairline pt-3 text-left text-[13px] font-medium text-ap-blue hover:text-ap-blue-hover">
        <Send className="size-4" strokeWidth={1.7} /> Publish to Gravity Pants
      </button>
      {open && <PublishDialog projectId={projectId} onClose={() => setOpen(false)} />}
    </>
  );
}

function PublishDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const list = useServerFn(listDirectoryBrands);
  const publish = useServerFn(adminPublishAd);
  const brands = useQuery({ queryKey: ["admin", "directory-brands"], queryFn: () => list() });
  const [brandId, setBrandId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    try {
      const r = await publish({ data: { projectId, brandId: brandId && brandId !== "new" ? brandId : null, brandName: brandId === "new" ? newName : null } });
      setDone(r.workspace);
      toast.success(r.failedFiles ? `Copied, but ${r.failedFiles} file(s) couldn't be copied.` : "Copied to Gravity Pants.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to Gravity Pants</DialogTitle>
          <DialogDescription>Makes a copy of this ad, its photos and brand kit in the brand's own Gravity Pants workspace. The client's ad stays as it is.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-[14px]">The copy is in <b>{done}</b>. <Link to="/admin/published" className="text-ap-blue">Open published reels</Link></p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[13px] font-semibold text-ap-muted" htmlFor="gp-brand">Brand</label>
            <select id="gp-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-10 w-full rounded-[4px] border border-input bg-card px-2 text-[14px]">
              <option value="">{brands.isLoading ? "Loading brands…" : "Choose a brand"}</option>
              {(brands.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="new">New brand…</option>
            </select>
            {brandId === "new" && <Input aria-label="New brand name" placeholder="Brand name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{done ? "Close" : "Cancel"}</Button>
          {!done && <Button onClick={go} disabled={busy || !brandId || (brandId === "new" && !newName.trim())}>{busy ? "Copying…" : "Publish copy"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
