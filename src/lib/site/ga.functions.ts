import { createServerFn } from "@tanstack/react-start";

/** The GA4 Measurement ID is public (it ships in every page), so the browser may read it. */
export const getMeasurementId = createServerFn({ method: "GET" }).handler(async () => {
  const id = (process.env['GOOGLE_ANALYTICS_MEASUREMENT_ID'] ?? process.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'] ?? "").trim();
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
});
