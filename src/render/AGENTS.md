# Rules for this folder
- Font loading for canvas goes through `loadFont()` in `src/lib/stillframe/fonts.ts` (css2 per weight, uploaded fonts via FontFace) so `ensureFonts` never renders with a fallback.
- Export runs in the browser (`src/render/exportMedia.ts`): MP4 via WebCodecs + Mediabunny with ffmpeg.wasm (lazy, from CDN) as fallback, GIF via ffmpeg.wasm two-pass palette — no server rendering, so output always matches renderAt.
- HTML5 banner export (`exportHtml5.ts`) ships `html5-runtime.ts` bundled by the `virtual:html5-runtime` Vite plugin (vite.html5-runtime.ts) so banners draw with the same `renderAt()`; keep that entry free of React/server imports.
