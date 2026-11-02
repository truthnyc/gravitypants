# Editor layout v2 — Prompt 1: full-screen Edit step shell

Re-layout of the existing Edit step (`/app/ad/:id/edit`), not a rebuild. Every current control, autosave, undo history, renderer and design tokens stay; controls only move.

Note: the uploaded file contains Prompt 1 only, and the Claude artifact link cannot be opened from here (it needs your Claude sign-in). Prompts 2–7 and screenshots can be sent next.

## Step 0 — Inventory (kept, nothing lost)
Preview as (9:16, 4:5, 1:1, 5:4, 16:9), Reels/TikTok safe zones, Larger preview, play bar, frame strip (thumbnails, menu, duration pills, transition labels, add tile), Photo / Text (Headline, Subline) / Logo tabs, "Style changes apply to: This frame | All frames", More text options, Undo, Next: Export, Brand dropdown, Format dropdown. This list is reported back before changing anything.

## What you will see
1. **Top bar (56px)** — left: back to Your Ads, ad name, "Saved". Centre: step bar (Format, Photos, Edit, Export, Share). Right: Undo and Redo (keyboard shortcuts, greyed when nothing to undo/redo), a menu holding Brand kit, Format and Help, then "Next: Export". The bottom Undo / Next row is removed.
2. **Main row, full height, no page scroll:**
   - Icon rail (76px) and settings drawer (352px, can be collapsed) on the left. For this step, the drawer holds today's Photo / Text / Logo panels unchanged, with simple rail buttons switching between them; Prompt 2 will redesign both.
   - Stage filling the rest: a 52px bar (left: "Preview as" segmented choice, no wrapping; centre: empty slot for Prompt 2's toolbar; right: a "Safe zones" chip, blue when on, replacing the checkbox), then a light-grey rounded canvas with a faint dot grid and the preview centred.
3. **Timeline (116px), full width:** play button and time ("0:03.5 / 0:17.0") on the left; frame strip in the middle (64px rounded thumbnails, frame number, duration pill, transition labels between frames, dashed "+" tile); "5 frames · 17.0 sec" on the right. Existing thumbnail menu, timing and transition popovers move here. During playback the current thumbnail shows a thin blue progress bar.

## Preview size
- The preview is always the largest frame of the chosen ratio that fits the canvas (40px side margin, 28px top/bottom), recalculated whenever the space changes, and glides (280ms) when the drawer opens/closes. About 360×640 for 9:16 at 1440×900.
- Small grey label bottom-left, e.g. "9:16 · 1080 × 1920" (5:4 = 1350 × 1080).
- "Larger preview" button removed.

## Smaller screens
Below 1000px wide: the drawer becomes a bottom sheet over the canvas, the rail becomes a bottom tab row, the timeline stays. Checked at 1440×900, 1280×800 and phone width.

## Technical details
- Files: `Editor.tsx` (layout grid, remove footer row and Larger preview), `EditorHeader.tsx` (Redo, menu with Brand/Format/Help), `Stage.tsx` (ResizeObserver fit + animated size, label, dot grid), `Timeline.tsx` / `FrameRail.tsx` (bottom strip, progress bar), `MobileEditorControls.tsx` (sheet + tab row under 1000px).
- Grey canvas and dot grid added as semantic tokens in `src/styles.css` (no raw `#ececf0` in components). Radii follow project rules (4px panels, 8px buttons/segments).
- Reuse `use-editor.ts` `redo`/`canRedo` (already exist); Inspector panels reused as-is, so no logic is duplicated.
- Other steps (Format, Photos, Export, Share) untouched. Playwright check of layout sizes, drawer toggle, undo/redo and playback.
