// Plain-language summary of a frame's photo movement, for the client reel page.
type P = { movement?: string; movement_intensity?: string; zoom_start?: number; zoom_end?: number; pan_x?: number; pan_y?: number };

const PRESET: Record<string, string> = {
  slow_zoom_in: "Slow zoom in",
  slow_zoom_out: "Slow zoom out",
  pan_left: "Pans left",
  pan_right: "Pans right",
  pan_up: "Pans up",
  pan_down: "Pans down",
};

const pct = (z: number) => `${Math.round(z * 100)}%`;

export function movementLabel(p: P | null | undefined): { custom: boolean; text: string } {
  const m = p?.movement ?? "none";
  if (m === "custom") {
    const zs = p?.zoom_start ?? 1, ze = p?.zoom_end ?? 1;
    const parts: string[] = [];
    if (Math.abs(ze - zs) >= 0.005) parts.push(`Zoom ${pct(zs)} to ${pct(ze)}`);
    const x = p?.pan_x ?? 0, y = p?.pan_y ?? 0;
    const dirs = [x > 0.02 ? "right" : x < -0.02 ? "left" : "", y > 0.02 ? "down" : y < -0.02 ? "up" : ""].filter(Boolean);
    if (dirs.length) parts.push(`moves ${dirs.join(" and ")}`);
    const text = parts.length ? parts.join(", ") : "Holds still";
    return { custom: true, text: `Custom: ${text.charAt(0).toLowerCase()}${text.slice(1)}` };
  }
  if (PRESET[m]) {
    const i = p?.movement_intensity;
    return { custom: false, text: i && i !== "standard" ? `${PRESET[m]} (${i})` : PRESET[m]! };
  }
  return { custom: false, text: "No movement" };
}
