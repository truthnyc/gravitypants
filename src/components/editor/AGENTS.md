# Rules for this folder
- The editor holds one in-memory document with undo history (`src/components/editor/use-editor.ts`) and autosaves diffs via `saveEditorDoc` in `data.ts`.
- Slider drags use undo keys prefixed `drag:` which coalesce regardless of time, so one drag = one undo step.
- Edit step layout lives in `EditWorkspace.tsx` (top bar, rail, drawer, canvas, timeline); quick controls in `EditToolbar.tsx` call the same `InspectorActions` as the drawer so undo stays one stack. The drawer shows one `Inspector` `section` at a time.
- Format, Photos, Export and Share use `StudioShell` parts from `src/components/app-ui/StudioLayout.tsx` (56px top bar, 428px panel, same canvas fit rule, 116px bottom bar) so the preview never moves between steps; Edit composes the same sizes with its rail + drawer.
