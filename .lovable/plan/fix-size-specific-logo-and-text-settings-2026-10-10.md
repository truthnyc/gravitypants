# Fix size-specific logo and text settings

## Outcome

- Logo, headline, and subline visual settings are saved separately for 9:16, 4:5, 1:1, and 16:9.
- Changing one size immediately updates that preview without altering the other sizes.
- Preview and export use the same saved settings.
- Timing, text animation, photo movement, and transitions remain shared across sizes.

## Changes

### 1. Reproduce and isolate the failing edit path

- Test changes from both the settings controls and direct preview resizing for every size.
- Check the saved reel after reload to determine whether the problem is in editing, saving, restoring, or preview resolution.
- Cover logo size and headline/subline font, size, letter spacing, line height, colour, position, and badge/image size.

### 2. Correct size-specific updates

- Route every logo, headline, and subline visual change into the currently selected size only.
- Preserve each other size’s existing values when switching sizes or autosaving.
- Keep “Same on all frames” limited to frames within the current size; it must not copy the style to other sizes.
- Keep text animation shared across sizes as previously specified.

### 3. Keep preview and export aligned

- Resolve the selected size’s logo and text settings before drawing the editor preview.
- Use the same size-aware resolution in export so the finished MP4/GIF matches the preview.
- Ensure font assets and logo artwork referenced by any size are loaded before preview/export.

### 4. Regression coverage and verification

- Add focused tests proving subline font size, letter spacing, line height, headline styling, and logo size differ across all four sizes.
- Confirm direct preview resizing is also isolated by size.
- Confirm animation, movement, timing, and transitions still carry across all sizes.
- In a signed-in reel, edit each size, wait for **Saved**, reload, and verify the four previews retain their independent values.
- Check the latest build result and the editor at phone and desktop widths.

## Technical details

- Continue using the existing per-frame `format_overrides` data and per-project logo format overrides; no new table is expected.
- The exact defect is not yet confirmed: the current source contains size-aware helpers and baseline tests, so implementation starts by tracing the reported editor interaction through saved data and reload rather than replacing the storage model blindly.
