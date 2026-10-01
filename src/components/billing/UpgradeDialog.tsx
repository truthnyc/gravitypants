import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { closeUpgrade, FREE_EXPORTS, useUpgradeFeature, type Feature } from "@/lib/stillframe/plan";

const COPY: Record<Feature, { title: string; body: string }> = {
  export: { title: "You've used your exports", body: `The free trial includes ${FREE_EXPORTS} exports. Pick a plan, or add a pack of extra exports on the Billing page.` },
  gif: { title: "Animated GIFs come with a paid plan", body: "Every plan from Simple up saves your ads as GIFs as well as videos." },
  brand_kits: { title: "Brand kits come with a paid plan", body: "Save your logos, colors and fonts once and put them on any ad in one tap." },
  templates: { title: "Templates come with a paid plan", body: "Save an ad's look as a template and reuse it with new photos." },
  team_sharing: { title: "Sharing is part of the Team plan", body: "On Team, you and up to 3 teammates share brand kits, templates and 150 exports a month." },
  priority_support: { title: "Priority support is part of the Team plan", body: "Team customers get a reply within 6 hours." },
};

export function UpgradeDialog() {
  const f = useUpgradeFeature();
  const c = f ? COPY[f] : null;
  return (
    <Dialog open={!!f} onOpenChange={(o) => !o && closeUpgrade()}>
      <DialogContent className="w-[calc(100vw-24px)] rounded-sm sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">{c?.title}</DialogTitle>
          <DialogDescription className="text-[14px]">{c?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="plain" className="h-11 lg:h-9" onClick={closeUpgrade}>Not now</Button>
          <Button asChild className="h-11 lg:h-9" onClick={closeUpgrade}>
            <Link to="/pricing">See plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
