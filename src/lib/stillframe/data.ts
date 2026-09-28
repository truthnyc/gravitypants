import { getWorkspaceId } from "./workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, type UploadedPhoto } from "./media";
import {
  DEFAULT_LOGO,
  
  PACE_SECONDS,
  type BrandKit,
  type NamedBrandKit,
  type Frame,
  type LogoSettings,
  type Project,
  type ProjectWithFrames,
} from "./types";

const PROJECT_COLUMNS = "*";

function normalizeProject(row: Record<string, unknown>): Project {
  return {
    ...(row as unknown as Project),
    logo: { ...DEFAULT_LOGO, ...((row["logo"] as object) ?? {}) },
    end_card: (row["end_card"] as Project["end_card"]) ?? {},
    formats: (row["formats"] as Project["formats"]) ?? [],
  };
}

function normalizeFrame(row: Record<string, unknown>): Frame {
  return {
    ...(row as unknown as Frame),
    duration_sec: Number(row["duration_sec"] ?? 2.5),
  };
}

/** Uploads files one by one, reporting a per-file progress bar. */
async function uploadAll(
  files: File[],
  onProgress?: (items: UploadProgress[]) => void,
): Promise<UploadedPhoto[]> {
  const state: UploadProgress[] = files.map((file) => ({ name: file.name, progress: 0 }));
  onProgress?.([...state]);

  const uploaded: UploadedPhoto[] = [];
  for (const [index, file] of files.entries()) {
    state[index] = { name: file.name, progress: 0.15 };
    onProgress?.([...state]);
    uploaded.push(await uploadMedia(file, "photo"));
    state[index] = { name: file.name, progress: 1 };
    onProgress?.([...state]);
  }
  return uploaded;
}

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

/** All ads in the workspace (newest first), with their frames, excluding trashed ones. */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async (): Promise<ProjectWithFrames[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(`${PROJECT_COLUMNS}, frames(*)`)
        .eq("workspace_id", getWorkspaceId())
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...normalizeProject(row as Record<string, unknown>),
        frames: (((row as Record<string, unknown>)["frames"] as Record<string, unknown>[]) ?? [])
          .map(normalizeFrame)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? "none"),
    enabled: Boolean(id),
    queryFn: async (): Promise<ProjectWithFrames | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select(`${PROJECT_COLUMNS}, frames(*)`)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...normalizeProject(data as Record<string, unknown>),
        frames: (((data as Record<string, unknown>)["frames"] as Record<string, unknown>[]) ?? [])
          .map(normalizeFrame)
          .sort((a, b) => a.sort_order - b.sort_order),
      };
    },
  });
}

/** Autosave-friendly single frame update. */
export function useUpdateFrame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      frameId,
      projectId,
      patch,
    }: {
      frameId: string;
      projectId: string;
      patch: Partial<Omit<Frame, "id" | "project_id">>;
    }) => {
      const { error } = await supabase.from("frames").update(patch).eq("id", frameId);
      if (error) throw error;
      return { frameId, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Project> }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function framePayloadFromPhoto(photo: UploadedPhoto, index: number) {
  return {
    sort_order: index,
    duration_sec: 2.5,
    photo: {
      asset_id: photo.assetId,
      path: photo.path,
      url: photo.path,
      fit: "fill",
      focus: { x: 0.5, y: 0.5 },
      movement: "none",
      brightness: 0,
      darken_for_text: index === 0,
      background_color: null,
    },
    transition_in: { type: index === 0 ? "cut" : "fade", speed: "smooth" },
    headline:
      index === 0
        ? {
            text: "[Your headline]",
            size_px: 108,
            color: "#FFFFFF",
            animation: "rise",
            position: "center",
            same_on_all: false,
          }
        : null,
    subline: null,
    logo_visible: true,
  };
}

export type UploadProgress = { name: string; progress: number };

/** Upload photos, then create an ad with one frame per photo in the dropped order. */
export function useCreateAdFromPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      onProgress,
    }: {
      files: File[];
      onProgress?: (items: UploadProgress[]) => void;
    }) => {
      const uploaded = await uploadAll(files, onProgress);
      const [settings, named] = await Promise.all([fetchBrandKit(), fetchDefaultKit()]);
      const kit = settings ? effectiveKit(settings, named) : null;

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: getWorkspaceId(),
          name: "Untitled ad",
          primary_format: "9:16",
          formats: ["9:16"],
          pace: "standard",
          logo: { ...logoFromBrandKit(kit), kit_stamp: named?.updated_at ?? null },
          end_card: kit?.end_card ?? {},
          brand_kit_id: named?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: framesError } = await supabase.from("frames").insert(
        uploaded.map((photo, i) => {
          const payload = framePayloadFromPhoto(photo, i);
          if (payload.headline && kit) {
            Object.assign(payload.headline, {
              font_family: kit.headline_font ?? undefined,
              color: kit.colors[0] ?? "#FFFFFF",
            });
            if (!kit.headline_font) delete (payload.headline as { font_family?: string }).font_family;
          }
          return { ...payload, project_id: project.id };
        }),
      );
      if (framesError) throw framesError;

      return project.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

async function insertCopy(source: ProjectWithFrames, name: string, photos?: UploadedPhoto[]) {
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: getWorkspaceId(),
      name,
      primary_format: source.primary_format,
      formats: source.formats,
      pace: source.pace,
      logo: source.logo,
      end_card: source.end_card,
      brand_kit_id: source.brand_kit_id ?? null,
      thumbnail_url: photos ? null : source.thumbnail_url,
    })
    .select("id")
    .single();
  if (error) throw error;

  const frames = source.frames.map((frame, index) => {
    const replacement = photos?.[index];
    return {
      project_id: project.id,
      sort_order: index,
      duration_sec: frame.duration_sec,
      photo: replacement
        ? {
            ...frame.photo,
            asset_id: replacement.assetId,
            path: replacement.path,
            url: replacement.path,
            background_color: null,
          }
        : frame.photo,
      transition_in: frame.transition_in,
      headline: frame.headline,
      subline: frame.subline,
      logo_visible: frame.logo_visible,
    };
  });

  if (frames.length) {
    const { error: framesError } = await supabase.from("frames").insert(frames);
    if (framesError) throw framesError;
  }
  return project.id as string;
}

export function useDuplicateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: ProjectWithFrames) => insertCopy(project, `${project.name} — Copy`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/** Keeps text, timing, transitions, logo and layout; swaps the photos in order. */
export function useDuplicateWithNewPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      project,
      files,
      onProgress,
    }: {
      project: ProjectWithFrames;
      files: File[];
      onProgress?: (items: UploadProgress[]) => void;
    }) => {
      const uploaded = await uploadAll(files, onProgress);
      return insertCopy(project, `${project.name} — Copy`, uploaded);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useSetTrashed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trashed }: { id: string; trashed: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: trashed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function totalSeconds(frames: Frame[]) {
  return frames.reduce((sum, frame) => sum + Number(frame.duration_sec ?? 0), 0);
}

export type EditorDoc = { project: Project; frames: Frame[] };

const PROJECT_SAVE_FIELDS = ["name", "formats", "primary_format", "pace", "logo", "end_card", "brand_kit_id"] as const;

/** Persists the difference between two editor snapshots (project fields, changed/new frames, removed frames). */
export async function saveEditorDoc(prev: EditorDoc, next: EditorDoc) {
  const patch: Record<string, unknown> = {};
  for (const key of PROJECT_SAVE_FIELDS) {
    if (JSON.stringify(prev.project[key]) !== JSON.stringify(next.project[key])) patch[key] = next.project[key];
  }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("projects").update(patch as never).eq("id", next.project.id);
    if (error) throw error;
  }

  const before = new Map(prev.frames.map((f, i) => [f.id, JSON.stringify({ ...f, sort_order: i })]));
  const rows = next.frames
    .map((f, i) => ({ ...f, sort_order: i, project_id: next.project.id }))
    .filter((f) => before.get(f.id) !== JSON.stringify({ ...f }));
  const keep = new Set(next.frames.map((f) => f.id));
  const removed = prev.frames.filter((f) => !keep.has(f.id)).map((f) => f.id);

  if (removed.length) {
    const { error } = await supabase.from("frames").delete().in("id", removed);
    if (error) throw error;
  }
  if (rows.length) {
    const { error } = await supabase.from("frames").upsert(rows as never);
    if (error) throw error;
  }
}

/* ---------------- Brand Kit */

export const brandKitKey = ["brand-kit", ] as const;

function normalizeBrandKit(row: Record<string, unknown>): BrandKit {
  return {
    ...(row as unknown as BrandKit),
    logos: (row["logos"] as BrandKit["logos"]) ?? [],
    colors: (row["colors"] as string[]) ?? [],
    default_logo_positions: (row["default_logo_positions"] as BrandKit["default_logo_positions"]) ?? {},
    end_card: (row["end_card"] as BrandKit["end_card"]) ?? {},
    custom_fonts: (row["custom_fonts"] as BrandKit["custom_fonts"]) ?? [],
    logo_size_pct: Number(row["logo_size_pct"] ?? 16),
  };
}

export async function fetchBrandKit(): Promise<BrandKit | null> {
  const { data, error } = await supabase.from("brand_kit").select("*").eq("workspace_id", getWorkspaceId()).maybeSingle();
  if (error) throw error;
  if (data) return normalizeBrandKit(data as Record<string, unknown>);
  const { data: created, error: e2 } = await supabase
    .from("brand_kit")
    .insert({ workspace_id: getWorkspaceId() })
    .select("*")
    .single();
  if (e2) throw e2;
  return normalizeBrandKit(created as Record<string, unknown>);
}

export function useBrandKit() {
  return useQuery({ queryKey: brandKitKey, queryFn: fetchBrandKit });
}

/** Optimistic Brand Kit update. */
export function useUpdateBrandKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<BrandKit>) => {
      const { error } = await supabase
        .from("brand_kit")
        .update(patch as never)
        .eq("workspace_id", getWorkspaceId());
      if (error) throw error;
    },
    onMutate: (patch) => {
      queryClient.setQueryData<BrandKit | null>(brandKitKey, (k) => (k ? { ...k, ...patch } : k));
    },
    onError: () => queryClient.invalidateQueries({ queryKey: brandKitKey }),
  });
}

/** Logo settings a new ad starts with. Primary = for light photos (dark artwork), Reversed = for dark photos. */
export function logoFromBrandKit(kit: BrandKit | null | undefined, base: LogoSettings = DEFAULT_LOGO): LogoSettings {
  if (!kit) return base;
  const primary = kit.logos.find((l) => l.role === "primary") ?? kit.logos[0];
  const reversed = kit.logos.find((l) => l.role === "reversed");
  return {
    ...base,
    path: primary?.path ?? reversed?.path ?? null,
    dark_path: primary?.path ?? null,
    light_path: reversed?.path ?? null,
    size_pct: kit.logo_size_pct ?? base.size_pct,
    positions: { ...base.positions, ...kit.default_logo_positions },
  };
}

export const paceSeconds = PACE_SECONDS;

/* ---------------- Named brand kits (shareable) */

export const brandKitsKey = ["brand-kits"] as const;

export async function fetchBrandKits(): Promise<NamedBrandKit[]> {
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("workspace_id", getWorkspaceId())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r as unknown as NamedBrandKit), colors: (r.colors as string[]) ?? [] }));
}

async function fetchDefaultKit(): Promise<NamedBrandKit | null> {
  const kits = await fetchBrandKits().catch(() => []);
  return kits.find((k) => k.is_default) ?? null;
}

export function useBrandKits() {
  return useQuery({ queryKey: [...brandKitsKey, getWorkspaceId()], queryFn: fetchBrandKits });
}

export type KitDraft = Pick<NamedBrandKit, "name" | "logo_url" | "logo_dark_url" | "colors" | "headline_font" | "subline_font">;

export function useSaveBrandKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draft }: { id?: string | undefined; draft: KitDraft }) => {
      if (id) {
        const { error } = await supabase.from("brand_kits").update(draft).eq("id", id);
        if (error) throw error;
        return id;
      }
      const ws = getWorkspaceId();
      const existing = await fetchBrandKits();
      const { data, error } = await supabase
        .from("brand_kits")
        .insert({ ...draft, workspace_id: ws, is_default: existing.length === 0 })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKitsKey }),
  });
}

export function useDeleteBrandKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKitsKey }),
  });
}

export function useSetDefaultKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | null) => {
      const { error } = await supabase.rpc("set_default_brand_kit", { _ws: getWorkspaceId(), _kit: id as string });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKitsKey }),
  });
}

/** Whether this workspace's plan includes brand kits (Simple, Business, Team). */
export function useKitsEnabled() {
  return useQuery({
    queryKey: ["brand-kits-enabled", getWorkspaceId()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_kits_enabled", { _ws: getWorkspaceId() });
      if (error) return false;
      return Boolean(data);
    },
  });
}

/** Owners and admins may change kits; editors can only use them. */
export function useCanEditKits() {
  return useQuery({
    queryKey: ["workspace-role", getWorkspaceId()],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", getWorkspaceId())
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (data) return data.role === "owner" || data.role === "admin";
      const { data: admin } = await supabase.rpc("is_platform_admin");
      return Boolean(admin);
    },
  });
}

/** Workspace ad settings (end card, logo size/placement) combined with the ad's chosen kit. */
export function effectiveKit(settings: BrandKit, named: NamedBrandKit | null | undefined): BrandKit {
  const logos: BrandKit["logos"] = [];
  if (named?.logo_url) logos.push({ id: "kit-logo", path: named.logo_url, name: "Logo", role: "primary" });
  if (named?.logo_dark_url) logos.push({ id: "kit-logo-dark", path: named.logo_dark_url, name: "Logo for dark photos", role: "reversed" });
  return {
    ...settings,
    logos,
    colors: named?.colors ?? [],
    headline_font: named?.headline_font ?? null,
    body_font: named?.subline_font ?? null,
  };
}

/* ---------------- Templates (no photos; private or shared with the team) */

export type TemplateFrame = Pick<Frame, "duration_sec" | "transition_in" | "headline" | "subline" | "logo_visible"> & {
  photo: Frame["photo"];
};
export type TemplateSettings = Pick<Project, "formats" | "primary_format" | "pace" | "logo" | "end_card"> & {
  brand_kit_id?: string | null;
  frame_count: number;
  frames: TemplateFrame[];
};
export type Template = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  thumbnail_url: string | null;
  visibility: "private" | "team";
  settings: TemplateSettings;
  updated_at: string;
};

export const templatesKey = ["templates"] as const;

export function templateFromProject(p: ProjectWithFrames): TemplateSettings {
  return {
    formats: p.formats,
    primary_format: p.primary_format,
    pace: p.pace,
    logo: p.logo,
    end_card: p.end_card,
    brand_kit_id: p.brand_kit_id ?? null,
    frame_count: p.frames.length,
    frames: p.frames.map((f) => ({
      duration_sec: f.duration_sec,
      transition_in: f.transition_in,
      headline: f.headline,
      subline: f.subline,
      logo_visible: f.logo_visible,
      // Photo style only — the picture itself is never saved.
      photo: Object.fromEntries(
        (["fit", "focus", "zoom", "movement", "brightness", "darken_for_text", "background_color"] as const)
          .filter((k) => f.photo[k] !== undefined)
          .map((k) => [k, f.photo[k]]),
      ) as Frame["photo"],
    })),
  };
}

export function useTemplates() {
  return useQuery({
    queryKey: [...templatesKey, getWorkspaceId()],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("workspace_id", getWorkspaceId())
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ project, name, visibility }: { project: ProjectWithFrames; name: string; visibility: Template["visibility"] }) => {
      const { error } = await supabase.from("templates").insert({
        workspace_id: getWorkspaceId(),
        name,
        visibility,
        thumbnail_url: project.thumbnail_url,
        settings: templateFromProject(project) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Template, "name" | "visibility">> }) => {
      const { data, error } = await supabase.from("templates").update(patch).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Only the person who made this template, or an owner or admin, can change it.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("templates").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Only the person who made this template, or an owner or admin, can delete it.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  });
}

/** Builds a photo-less source ad from a template, stretched or trimmed to the photo count. */
function sourceFromTemplate(t: Template, count: number): ProjectWithFrames {
  const s = t.settings;
  const styles = s.frames.length ? s.frames : [framePayloadFromPhoto({ assetId: "", path: "", url: null, width: 0, height: 0, name: "" }, 0) as unknown as TemplateFrame];
  const now = new Date().toISOString();
  return {
    id: "",
    workspace_id: getWorkspaceId(),
    name: t.name,
    primary_format: s.primary_format,
    formats: s.formats,
    pace: s.pace,
    logo: { ...DEFAULT_LOGO, ...s.logo },
    end_card: s.end_card ?? {},
    brand_kit_id: s.brand_kit_id ?? null,
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
      } as Frame;
    }),
  };
}

/** New ad from photos + a template — same path as Duplicate with New Photos. */
export function useCreateAdFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ template, files, onProgress }: { template: Template; files: File[]; onProgress?: (items: UploadProgress[]) => void }) => {
      const uploaded = await uploadAll(files, onProgress);
      return insertCopy(sourceFromTemplate(template, uploaded.length), "Untitled ad", uploaded);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/** Workspace name and what its plan allows for templates. */
export function useTemplateAccess() {
  return useQuery({
    queryKey: ["template-access", getWorkspaceId()],
    queryFn: async () => {
      const ws = getWorkspaceId();
      const [{ data: w }, { data: paid }, { data: team }, { data: auth }] = await Promise.all([
        supabase.from("workspaces").select("name").eq("id", ws).maybeSingle(),
        supabase.rpc("brand_kits_enabled", { _ws: ws }),
        supabase.rpc("workspace_is_team", { _ws: ws }),
        supabase.auth.getUser(),
      ]);
      const { count } = await supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", ws);
      return {
        name: (w?.name as string) ?? "your workspace",
        paid: Boolean(paid),
        team: Boolean(team),
        isTeamWorkspace: Boolean(team) || (count ?? 1) > 1,
        userId: auth.user?.id ?? null,
      };
    },
  });
}
