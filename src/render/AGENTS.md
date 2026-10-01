# Rules for this folder
- Font loading for canvas goes through `loadFont()` in `src/lib/stillframe/fonts.ts` (css2 per weight, uploaded fonts via FontFace) so `ensureFonts` never renders with a fallback.
- Export runs in the browser (`src/render/exportMedia.ts`): MP4 via WebCodecs + Mediabunny with ffmpeg.wasm (lazy, from CDN) as fallback, GIF via ffmpeg.wasm two-pass palette — no server rendering, so output always matches renderAt.
