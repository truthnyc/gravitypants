import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GUIDE_SECTIONS } from "@/lib/stillframe/guide";
import { cn } from "@/lib/utils";

export function GuideNavigation() {
  const [active, setActive] = useState(GUIDE_SECTIONS[0]?.id ?? "before-you-start");
  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (GUIDE_SECTIONS.some((s) => s.id === id)) {
        setActive(id);
        requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
      }
    };
    sync();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const last = GUIDE_SECTIONS.filter((s) => (document.getElementById(s.id)?.getBoundingClientRect().top ?? Infinity) <= 185).at(-1);
        setActive(last?.id ?? GUIDE_SECTIONS[0]?.id ?? "before-you-start");
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  const jump = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
    setActive(id);
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };
  return <aside className="sticky top-[60px] z-20 self-start border-b border-ap-hairline bg-ap-card py-3 lg:top-[84px] lg:z-0 lg:max-h-[calc(100dvh-108px)] lg:overflow-y-auto lg:border-b-0 lg:py-0">
    <div className="lg:hidden"><Select value={active} onValueChange={jump}>
      <SelectTrigger aria-label="Jump to a tutorial section" data-cta="guide-jump-to" className="h-11 border-ap-hairline bg-ap-card text-ap-ink"><span className="mr-2 text-ap-muted">Jump to</span><SelectValue /></SelectTrigger>
      <SelectContent>{GUIDE_SECTIONS.map((s, i) => <SelectItem key={s.id} value={s.id} className="min-h-11">{i + 1}. {s.shortTitle}</SelectItem>)}</SelectContent>
    </Select></div>
    <nav aria-label="Tutorial contents" className="hidden lg:block"><p className="mb-3 px-3 text-[12px] font-semibold text-ap-muted">In this guide</p><ol className="space-y-0.5">{GUIDE_SECTIONS.map((s, i) => <li key={s.id}>
      <Button variant="ghost" aria-current={active === s.id ? "location" : undefined} data-cta={`guide-contents-${s.id}`} onClick={() => jump(s.id)} className={cn("h-auto min-h-11 w-full justify-start gap-3 whitespace-normal rounded-sm px-3 py-2 text-left text-[13px] font-normal text-ap-body", active === s.id && "bg-ap-soft-blue font-medium text-ap-blue")}><span className="w-4 shrink-0 text-right tabular-nums text-ap-muted">{i + 1}</span><span>{s.shortTitle}</span></Button>
    </li>)}</ol></nav>
  </aside>;
}
