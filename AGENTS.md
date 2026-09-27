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
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.
- Font loading for canvas goes through `loadFont()` in `src/lib/stillframe/fonts.ts` (css2 per weight, uploaded fonts via FontFace) so `ensureFonts` never renders with a fallback.
- Slider drags use undo keys prefixed `drag:` which coalesce regardless of time, so one drag = one undo step.
- Export runs in the browser (`src/render/exportMedia.ts`): MP4 via WebCodecs + Mediabunny with ffmpeg.wasm (lazy, from CDN) as fallback, GIF via ffmpeg.wasm two-pass palette — no server rendering, so output always matches renderAt.
- Finished exports are uploaded to the private media bucket at `exports/<project-id>/<timestamp>/<file>` (bucket limit raised to 500MB for GIFs) and listed from storage, not a table.
