# Rules for this folder
- The editor holds one in-memory document with undo history (`src/components/editor/use-editor.ts`) and autosaves diffs via `saveEditorDoc` in `data.ts`.
- Slider drags use undo keys prefixed `drag:` which coalesce regardless of time, so one drag = one undo step.
