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

export type FirstTouch = { ref?: string | null; source: string | null; medium: string | null; campaign: string | null; referrer: string | null; landing: string; at?: number };

const TOUCH_DAYS = 30;

/** First visit wins; kept for 30 days. Older stored values without a date are treated as expired. */
export function firstTouch(): FirstTouch | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOUCH) ?? "null") as FirstTouch | null;
    if (!t || !t.at || Date.now() - t.at > TOUCH_DAYS * 86400000) return null;
    return t;
  } catch { return null; }
}

/** Saves the first-touch source on the signed-in user's profile once; later calls are ignored by the database. */
export async function saveSignupSource(meta?: unknown) {
  try {
    if (sessionStorage.getItem("gp_src_saved")) return;
    const m = (meta && typeof meta === "object" ? meta : null) as Partial<FirstTouch> | null;
    const t: Partial<FirstTouch> = firstTouch() ?? m ?? {};
    const c = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null);
    const { error } = await supabase.rpc("record_signup_source" as never, {
      _ref: c(t.ref), _utm_source: c(t.source), _utm_medium: c(t.medium), _utm_campaign: c(t.campaign),
      _landing_path: c(typeof t.landing === "string" ? t.landing.split(/[?#]/)[0] : null), _referrer_host: c(t.referrer),
    } as never);
    if (!error) sessionStorage.setItem("gp_src_saved", "1");
  } catch { /* never block sign-in */ }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (/^\/(app|admin)(\/|$)/.test(path)) return;
  try {
    const q = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : null;
    const utm = { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") };
    if (!firstTouch()) {
      localStorage.setItem(TOUCH, JSON.stringify({
        ref: clip(q.get("ref"), 100), source: clip(utm.source, 100), medium: clip(utm.medium, 100), campaign: clip(utm.campaign, 100),
        referrer: ref ? clip(new URL(ref).hostname, 100) : null, landing: clip(path.split(/[?#]/)[0], 100) ?? "/", at: Date.now(),
      } satisfies FirstTouch));
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
    } as never).then(() => undefined);
  } catch {
    /* tracking must never break the page */
  }
}
