<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Stillframe architecture rules

- Routing uses TanStack Router file routes in `src/routes` (`ad.$id.edit.tsx` etc.), not React Router — the stack fixes the router.
- All project/frame reads and writes go through the hooks in `src/lib/stillframe/data.ts` so the editor can autosave from one place.
- Domain types and shared constants (workspace id, formats, defaults) live in `src/lib/stillframe/types.ts`.
- The `media` storage bucket is private; resolve image URLs with `getMediaUrl()` in `src/lib/stillframe/media.ts` (workspace policy blocks public buckets).
- Design tokens live only in `src/styles.css`; components use semantic classes (`bg-canvas`, `text-secondary-text`, `bg-control-fill`), never raw colors.
- Preview and export both draw through `renderAt()` in `src/render/renderFrame.ts`; never add a second drawing path — the look must match everywhere.
- The editor holds one in-memory document with undo history (`src/components/editor/use-editor.ts`) and autosaves diffs via `saveEditorDoc` in `data.ts`.
