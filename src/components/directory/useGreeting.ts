import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chooseGreeting, readReturning, rememberVisit, type Chosen } from "@/lib/directory/greeting";
import { getGreetingConfig, getVisitorContext, recordGreetingEvent } from "@/lib/directory/greeting.functions";

import { lookupBrowserLocation } from "@/lib/directory/visitor-context";

const sid = () => {
  try {
    let v = sessionStorage.getItem("gp_sid");
    if (!v) { v = crypto.randomUUID().replace(/-/g, "").slice(0, 32); sessionStorage.setItem("gp_sid", v); }
    return v;
  } catch { return "anon"; }
};

/** Logs greeting analytics; never throws. "filter" is only logged once per page view. */
export function logGreeting(c: Chosen | null, action: "shown" | "mood_click" | "filter") {
  if (!c) return;
  try {
    void recordGreetingEvent({ data: { session_id: sid(), rule: c.rule, greeting: c.filled.replace(/\*\*/g, "").slice(0, 80), action } }).catch(() => {});
  } catch { /* analytics must never break the page */ }
}

/**
 * Picks the visitor's greeting after hydration. Server render shows "Happy {day}." until then.
 * hasReels gets (category, brand) display names.
 */
export function useGreeting(hasReels: (c: string | null, b: string | null) => boolean, fallbackMood: string, ready: boolean) {
  const cfg = useQuery({ queryKey: ["directory-greeting"], staleTime: 300_000, queryFn: () => getGreetingConfig() });
  const vis = useQuery({ queryKey: ["directory-visitor"], staleTime: 1_800_000, retry: false, queryFn: async () => {
    const context = await getVisitorContext();
    if (!context.needsLocation) return context;
    const location = await lookupBrowserLocation();
    return location ? getVisitorContext({ data: { location } }) : context;
  } });
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !cfg.data || vis.isPending || !ready) return;
    done.current = true;
    const v = vis.data ?? { country: null, city: null, weather: null };
    const c = chooseGreeting(cfg.data, { now: new Date(), country: v.country, city: v.city, weather: v.weather, returningMood: readReturning(), hasReels, fallbackMood });
    rememberVisit();
    setChosen(c);
    logGreeting(c, "shown");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.data, vis.isPending, ready]);
  return chosen;
}
