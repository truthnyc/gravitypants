import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, type UploadedPhoto } from "./media";
import {
  DEFAULT_LOGO,
  WORKSPACE_ID,
  type Frame,
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
        .eq("workspace_id", WORKSPACE_ID)
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


      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: WORKSPACE_ID,
          name: "Untitled ad",
          primary_format: "9:16",
          formats: ["9:16"],
          pace: "standard",
          logo: DEFAULT_LOGO,
          end_card: {},
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: framesError } = await supabase
        .from("frames")
        .insert(uploaded.map((photo, i) => ({ ...framePayloadFromPhoto(photo, i), project_id: project.id })));
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
      workspace_id: WORKSPACE_ID,
      name,
      primary_format: source.primary_format,
      formats: source.formats,
      pace: source.pace,
      logo: source.logo,
      end_card: source.end_card,
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

const PROJECT_SAVE_FIELDS = ["name", "formats", "primary_format", "pace", "logo", "end_card"] as const;

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
