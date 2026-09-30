# Fix editor saving and add frame-specific logos

## Outcome

- Reel edits save reliably instead of ending on **Not saved**.
- Choosing **This frame** shows the logo only on the currently selected frame, with an on/off control for other frames.
- An ad can hold both a light and dark logo, and each frame can use Auto, Light, or Dark according to its background.

## Changes

### 1. Repair editor autosave

- Save only the editable frame fields instead of sending database-generated timestamps back during every frame update.
- Keep the last successfully saved version as the comparison point and refresh the correct reel after saving.
- Preserve the existing 600ms autosave and undo behavior.

### 2. Make “This frame” truly frame-specific

- When **This frame** is chosen, turn the logo off on every other frame and on for the selected frame.
- Keep **Show on this frame** available as the user moves between frames, so more frames can be added deliberately.
- Existing ads using **All frames** or **First & last** remain unchanged.

### 3. Add light and dark logo versions

- Add separate **Light logo** and **Dark logo** upload/replace controls in the editor.
- Save a per-frame choice of Auto, Light, or Dark.
- Auto continues choosing the best contrast from the photo; a frame-specific Light or Dark choice overrides Auto only for that frame.
- Preview and export continue using the same drawing path.

### 4. Security housekeeping

- Keep website reel files private and serve them only through the existing temporary signed links, removing the overly broad direct-download rule.

## Verification

- Change reel text, timing, photo settings, logo scope, and logo version; confirm **Saved**, reload, and verify every change persists.
- Confirm **This frame** initially appears only on the selected frame, then enable another frame manually.
- Confirm light/dark/auto choices match in preview and export rendering.
- Check desktop and phone editor layouts and the latest build result.
