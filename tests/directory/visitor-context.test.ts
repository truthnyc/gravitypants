import { describe, expect, it, vi } from "vitest";
import { countryCode, parseLocation, fetchLocalWeather } from "../../src/lib/directory/visitor-context";

describe("real visitor location and weather", () => {
  it("uses provider country and approximate coordinates without retaining the IP", () => {
    expect(parseLocation({ country_code: "gb", city: "London", latitude: "51.5074", longitude: "-0.1278", ip: "8.8.8.8" })).toEqual({ country: "GB", city: "London", latitude: 51.51, longitude: -0.13 });
  });
  it("does not invent coordinates from missing values", () => {
    expect(parseLocation({ latitude: null, longitude: null })).toBeNull();
    expect(parseLocation({ latitude: "", longitude: "" })).toBeNull();
    expect(parseLocation({ latitude: 91, longitude: 0 })).toBeNull();
    expect(countryCode("XX")).toBeNull();
  });
  it("allows valid zero coordinates", () => {
    expect(parseLocation({ latitude: 0, longitude: 0 })?.latitude).toBe(0);
  });
  it("requests weather at the visitor's coordinates and maps actual rain", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ current: { weather_code: 61, temperature_2m: 12.3, is_day: 1 }, daily: { sunset: ["2026-10-06T17:29"] } }));
    const weather = await fetchLocalWeather({ country: "GB", city: "London", latitude: 51.51, longitude: -0.13 }, request);
    const query = new URL(String(request.mock.calls[0]?.[0])).searchParams;
    expect([query.get("latitude"), query.get("longitude")]).toEqual(["51.51", "-0.13"]);
    expect(weather).toEqual({ kind: "rain", tempC: 12.3, isDay: true, sunset: "2026-10-06T17:29Z" });
  });
  it("falls back without fabricated weather when the provider fails", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"));
    expect(await fetchLocalWeather({ country: "US", city: null, latitude: 40.71, longitude: -74.01 }, request)).toBeNull();
  });
  it("rejects incomplete provider weather rather than defaulting to a temperature", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ current: { weather_code: 61 } }));
    expect(await fetchLocalWeather({ country: "US", city: null, latitude: 40.71, longitude: -74.01 }, request)).toBeNull();
  });
});