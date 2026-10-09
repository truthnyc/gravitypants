import type { BrandStyle } from "@/render/renderFrame";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys, saveEditorDoc, type EditorDoc } from "@/lib/stillframe/data";
import { ensureFonts, mediaPaths } from "@/render/renderFrame";
import { loadImages } from "@/render/images";

export type ElementKey = "photo" | "headline" | "subline" | "logo" | "timing" | "transition";

export const ELEMENT_META: Record<ElementKey, { label: string; color: string }> = {
  photo: { label: "Photo", color: "var(--el-photo)" },
  headline: { label: "Headline", color: "var(--el-headline)" },
  subline: { label: "Subline", color: "var(--el-subline)" },
  logo: { label: "Logo", color: "var(--el-logo)" },
  timing: { label: "Timing", color: "var(--el-timing)" },
  transition: { label: "Transition", color: "var(--el-timing)" },
};

/** Editor document with undo/redo. Rapid edits with the same key (slider drags, typing) coalesce. */
export function useEditorDoc(initial: EditorDoc) {
  const [state, setState] = useState({ doc: initial, past: [] as EditorDoc[], future: [] as EditorDoc[] });
  const last = useRef<{ key: string; at: number } | null>(null);

  const apply = useCallback((fn: (d: EditorDoc) => EditorDoc, key?: string) => {
    const now = Date.now();
    const coalesce = Boolean(key && last.current?.key === key && (key.startsWith("drag:") || now - last.current.at < 1000));
    last.current = key ? { key, at: now } : null;
    setState((s) => {
      const next = fn(s.doc);
      if (next === s.doc) return s;
      return { doc: next, past: coalesce ? s.past : [...s.past.slice(-79), s.doc], future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = null;
    setState((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    last.current = null;
    setState((s) => {
      const next = s.future[0];
      if (!next) return s;
      return { doc: next, past: [...s.past, s.doc], future: s.future.slice(1) };
    });
  }, []);

  return { doc: state.doc, apply, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export type SaveStatus = "saved" | "saving" | "error";

/** Debounced (600ms) autosave through the data layer. Pending edits flush on unmount and the
 * cached ad is updated immediately so the next step (e.g. Photos -> Edit) opens with them. */
export function useAutosave(doc: EditorDoc, enabled = true) {
  const queryClient = useQueryClient();
  const saved = useRef(doc);
  const latest = useRef(doc);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<SaveStatus>("saved");
  latest.current = doc;

  const flush = useCallback(() => {
    const next = latest.current;
    if (next === saved.current) return chain.current;
    chain.current = chain.current.then(async () => {
      if (next === saved.current) return;
      try {
        await saveEditorDoc(saved.current, next);
        saved.current = next;
        setStatus((s) => (s === "saving" && latest.current === next ? "saved" : s));
        queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(next.project.id), exact: true });
      } catch (error) {
        console.error("Editor autosave failed", error);
        setStatus("error");
      }
    });
    return chain.current;
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || doc === saved.current) return;
    setStatus("saving");
    queryClient.setQueryData(projectKeys.detail(doc.project.id), (old: unknown) =>
      old ? { ...(old as object), ...doc.project, frames: doc.frames } : old,
    );
    const timer = setTimeout(() => void flush(), 600);
    return () => clearTimeout(timer);
  }, [doc, queryClient, enabled, flush]);

  // Never drop the last edit when leaving the page within the debounce window.
  useEffect(() => () => { if (enabled) void flush(); }, [enabled, flush]);

  return status;
}

/** Loads photos, logos and fonts the render engine needs. `version` bumps when ready. */
export function useRenderAssets(doc: EditorDoc, brand?: BrandStyle) {
  const [images, setImages] = useState(() => new Map<string, HTMLImageElement>());
  const [version, setVersion] = useState(0);
  const paths = mediaPaths(doc.project, doc.frames);
  const pathKey = paths.join("|");
  const fontKey = doc.frames
    .map((f) => `${f.headline?.font_family}${f.headline?.font_weight}${f.subline?.font_family}${f.subline?.font_weight}`)
    .join("|");

  useEffect(() => {
    let alive = true;
    Promise.all([loadImages(paths), ensureFonts(doc.frames, brand)]).then(([map]) => {
      if (!alive) return;
      setImages(map);
      setVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, fontKey, brand?.font]);

  return { images, version };
}
