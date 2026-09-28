import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTemplates, type Template } from "@/lib/stillframe/data";
import { templateSlug } from "@/components/templates/TemplatePreview";
import { cn } from "@/lib/utils";

/** The reusable kit an ad was made from, if it still exists. */
export function useKit(templateId: string | null | undefined): Template | null {
  const { data = [] } = useTemplates();
  return (templateId && data.find((t) => t.id === templateId && t.is_reusable)) || null;
}

export function KitAgainButton({ adId, templateId, className }: { adId: string; templateId: string | null | undefined; className?: string }) {
  const kit = useKit(templateId);
  if (!kit) return null;
  return (
    <Button asChild variant="plain" size="header" className={cn("h-11 lg:h-[34px]", className)}>
      <Link to="/app/templates/$slug" params={{ slug: templateSlug(kit) }} search={{ from: adId }}>
        <RefreshCw strokeWidth={1.7} /> Make another from this kit
      </Link>
    </Button>
  );
}
