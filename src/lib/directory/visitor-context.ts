import type { GreetingCtx, WeatherKind } from "./greeting";

export type ApproximateLocation = { country: string | null; city: string | null; latitude: number; longitude: number };
export type VisitorContext = { country: string | null; city: string | null; weather: GreetingCtx["weather"]; needsLocation: boolean };

function coordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export function countryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !["XX", "T1"].includes(code) ? code : null;
}

export function parseLocation(value: unknown): ApproximateLocation | null {
  if (!value || typeof value !== "object") return null;
  const geo = value as Record<string, unknown>;
  const latitude = coordinate(geo.latitude, 90), longitude = coordinate(geo.longitude, 180);
  if (latitude === null || longitude === null) return null;
  return {
    country: countryCode(geo.country_code ?? geo.country),
    city: typeof geo.city === "string" ? geo.city.trim().slice(0, 120) || null : null,
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}

function weatherKind(code: number): WeatherKind {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code <= 1) return "clear";
  return "cloudy";
}

export async function fetchLocalWeather(location: ApproximateLocation, request: typeof fetch = fetch): Promise<GreetingCtx["weather"]> {
  try {
    const query = new URLSearchParams({ latitude: location.latitude.toFixed(2), longitude: location.longitude.toFixed(2), current: "temperature_2m,weather_code,is_day", daily: "sunset", timezone: "GMT", forecast_days: "1" });
    const response = await request(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const j = payload as { current?: { weather_code?: unknown; temperature_2m?: unknown; is_day?: unknown }; daily?: { sunset?: unknown[] } };
    const current = j.current;
    if (!current || typeof current.weather_code !== "number" || !Number.isFinite(current.weather_code) || typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || (current.is_day !== 0 && current.is_day !== 1)) return null;
    const sunset = j.daily?.sunset?.[0];
    return { kind: weatherKind(current.weather_code), tempC: current.temperature_2m, isDay: current.is_day === 1, sunset: typeof sunset === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sunset) ? `${sunset}Z` : null };
  } catch { return null; }
}

/** Browser-side lookup sees the visitor's connection, never the hosting server's IP. */
export async function lookupBrowserLocation(): Promise<ApproximateLocation | null> {
  try {
    const response = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal: AbortSignal.timeout(5000), credentials: "omit", referrerPolicy: "no-referrer" });
    return response.ok ? parseLocation(await response.json()) : null;
  } catch { return null; }
}
