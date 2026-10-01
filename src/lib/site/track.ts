import { supabase } from "@/integrations/supabase/client";

/** First-party page-view capture for public pages. Never runs inside /app or /admin. */
const VID = "gp_vid";
const SID = "gp_sid";
const TOUCH = "gp_first_touch";

const rid = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "").slice(0, 32);
const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

function id(store: Storage, key: string) {
  let v = store.getItem(key);
  if (!v) { v = rid(); store.setItem(key, v); }
  return v;
}

export type FirstTouch = { source: string | null; medium: string | null; campaign: string | null; referrer: string | null; landing: string };

export function firstTouch(): FirstTouch | null {
  try { return JSON.parse(localStorage.getItem(TOUCH) ?? "null"); } catch { return null; }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (/^\/(app|admin)(\/|$)/.test(path)) return;
  try {
    const q = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : null;
    const utm = { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") };
    if (!localStorage.getItem(TOUCH)) {
      localStorage.setItem(TOUCH, JSON.stringify({ ...utm, referrer: ref ? new URL(ref).hostname : null, landing: path } satisfies FirstTouch));
    }
    const w = window.innerWidth;
    void supabase.from("page_views" as never).insert({
      visitor_id: id(localStorage, VID),
      session_id: id(sessionStorage, SID),
      path: clip(path, 300),
      referrer: ref ? clip(new URL(ref).hostname, 300) : null,
      utm_source: clip(utm.source, 100),
      utm_medium: clip(utm.medium, 100),
      utm_campaign: clip(utm.campaign, 150),
      device: w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop",
    } as never);
  } catch {
    /* tracking must never break the page */
  }
}
