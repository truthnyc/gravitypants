import { measurementPageAllowed } from "./ad-consent";

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }

let idPromise: Promise<string | null> | undefined;
let started = false;
let lastPath: string | null = null;

/** Google Analytics on public Gravity Pants pages only; one page_view per screen. */
export async function trackGaPage(host: string, path: string) {
  if (typeof window === "undefined" || !measurementPageAllowed(host, path)) return;
  try {
    idPromise ??= import("./ga.functions").then((m) => m.getMeasurementId()).catch(() => null);
    const id = await idPromise;
    if (!id) return;
    if (!started) {
      started = true;
      window.dataLayer ??= [];
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params -- gtag.js needs the Arguments object
        window.dataLayer!.push(arguments);
      };
      window.gtag("set", "developer_id.dZjgwMW", true);
      window.gtag("js", new Date());
      window.gtag("config", id, { send_page_view: false });
      const s = document.createElement("script");
      s.async = true; s.id = "gp-ga";
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
    }
    if (lastPath === path) return;
    lastPath = path;
    window.gtag?.("event", "page_view", { page_path: path, page_location: `${window.location.origin}${path}` });
  } catch { /* measurement must never break the page */ }
}
