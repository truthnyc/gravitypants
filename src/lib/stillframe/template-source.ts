/* Pure: the starting ad a template produces. Shared by the editor (data.ts) and the Shopify server routes. */
import type { Frame, ProjectWithFrames } from "./types";
import { DEFAULT_LOGO } from "./types";
import type { Template, TemplateFrame } from "./data";

export function sourceFromTemplate(t: Template, count: number, workspaceId: string, fallback: TemplateFrame): ProjectWithFrames {
  const s = t.settings;
  const styles = s.frames.length ? s.frames : [fallback];
  const now = new Date().toISOString();
  return {
    id: "",
    workspace_id: workspaceId,
    name: s.ad_title?.trim() || t.name,
    primary_format: s.primary_format,
    formats: s.formats,
    pace: s.pace,
    // Gravity Pants templates keep their logo only for previews; customers add their own.
    logo: t.source === "system"
      ? { ...DEFAULT_LOGO, ...s.logo, path: null, light_path: null, dark_path: null }
      : { ...DEFAULT_LOGO, ...s.logo },
    end_card: s.end_card ?? {},
    brand_kit_id: s.brand_kit_id ?? null,
    template_id: t.is_reusable && !t.id.startsWith("example") ? t.id : null,
    is_template: false,
    deleted_at: null,
    thumbnail_url: null,
    created_at: now,
    updated_at: now,
    frames: Array.from({ length: count }, (_, i) => {
      const f = styles[Math.min(i, styles.length - 1)]!;
      return {
        ...f,
        id: "",
        project_id: "",
        sort_order: i,
        transition_in: i === 0 ? { ...f.transition_in, type: "cut" } : f.transition_in,
        photo: { ...f.photo },
        logo_variant: f.logo_variant ?? null,
      } as Frame;
    }),
  };
}
