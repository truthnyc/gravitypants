# Responsive Gravity Pants app

## Goal
Keep every desktop screen unchanged at 1024px and wider. Add phone layouts below 768px and roomier versions of those same layouts from 768–1023px, using the supplied screens as the visual reference. Preserve all existing editing, export, account, billing, and admin behavior.

## Global responsive foundation
- Update the document viewport to include `viewport-fit=cover`.
- Prevent horizontal page scrolling and replace viewport-height layouts with dynamic viewport height.
- Add reusable safe-area spacing for fixed/sticky top and bottom bars.
- Make interactive controls at least 44×44px on touch layouts, inputs at least 16px, editor sliders use 28px thumbs, and color swatches use 32px.
- Keep all existing desktop dimensions and styling behind the 1024px breakpoint.
- Add a reusable mobile bottom-sheet treatment based on the app’s existing drawer control: white surface, 4px content corners where applicable, drag handle, scrollable body, and safe-area footer.

## Your Ads
- Replace the desktop navigation below 1024px with a compact header containing the Gravity Pants wordmark, a search icon, and a menu icon. Search and account/navigation controls open touch-friendly overlays; desktop navigation stays unchanged.
- Reflow the page heading, upload area, loading state, and empty state for phone/tablet widths.
- Turn “New ad from photos” into the full-width compact card shown in the reference, retaining the real multi-image file picker and upload progress.
- Render ads in a stable two-column grid on phones and tablets, with image-first cards, readable names/durations, and no clipped text.
- Keep direct card opening. Move the overflow actions into a mobile bottom sheet containing exactly: Open, Duplicate with New Photos, Save as Template, Rename, and Move to Trash. Preserve the current desktop dropdown and desktop duplicate action.

## Mobile editor
- Keep the current desktop editor composition at 1024px and wider. Build a separate responsive arrangement from the same state and callbacks below 1024px, so preview and saves remain identical.
- Create the compact top bar: back, editable ad name, save state plus “Step 2 of 3”, Undo, and Export. Remove the desktop step control and Play Video action only from this breakpoint.
- Center the existing shared canvas preview in the available space and constrain it by both width and height while retaining the selected format’s aspect ratio. Keep the preview visible and smaller while a control sheet is open.
- Place a round Play control and compact 9:16 / 1:1 / 16:9 switch beneath the preview. Format inclusion settings remain unchanged internally; the switch changes only the active preview format as today.
- Replace the desktop left rail and bottom timeline with a horizontal frame strip above the tool bar. Reuse the current rendered thumbnails, duration labels, selection, photo upload, frame actions, and reorder callback.
- Add touch reordering with a deliberate long-press followed by pointer dragging; ordinary taps still select and horizontal swipes still scroll. Include a dashed add-photos tile and retain frame menus/actions without exposing hover-only behavior.
- Add the six-tool bottom bar using the existing element colors and icons: Photo, Headline, Subline, Logo, Timing, Transition.
- Open the selected tool in a roughly 60dvh bottom sheet. The sheet includes a drag handle, selected tool/frame heading, Done button, horizontal element chips, and the exact existing inspector controls/actions rather than a second set of editing logic.
- Tapping an editable item on the preview selects it and opens its sheet on touch layouts. Keep drag, resize, inline text editing, crop/focus, and desktop pointer behavior intact.
- Adapt nested choices such as font selection and frame menus for touch-safe sizing and ensure the sheet remains usable in short landscape viewports.

## Mobile export
- Keep the existing desktop two-column export screen unchanged at 1024px and wider.
- Add the compact back/title header with the ad name and “Step 3 of 3”.
- Convert channel cards into full-width rows with a small live render, channel name, format and pixel size, and a 44px round selection control. Convert Custom size into a matching row with 16px inputs.
- Present Save as and Video motion as full-width segmented controls. Keep multiple file-type selection and the existing frame-rate values; use the shorter mobile labels shown in the reference.
- Collapse GIF quality to one summary row that opens a touch-friendly bottom sheet containing the same size, colors, frame-rate, loop, and explanatory controls.
- Move the live file count, video/GIF breakdown, duration, plan state, blocking message, and export action into a sticky safe-area bottom bar. The export button spans the available width.
- Keep validation notices and Previous exports in the scrolling body, with responsive download rows. Adapt progress and plan dialogs into mobile-safe sheets/dialogs without changing export behavior.

## Remaining app screens
- Apply a responsive pass to Brand Kit, Account, Billing/Pricing, authentication, and private admin pages: single-column grids where needed, compact page gutters, wrapping actions, touch-safe controls, and contained horizontal table scrolling where a table cannot become a list.
- Preserve every desktop layout from 1024px upward and make no data, authentication, billing, email, storage, or rendering-engine changes.

## Verification
- Check the authenticated Your Ads → Edit → Export flow at 375px, 390px, and 430px widths, plus representative phone landscape viewports and a 768–1023px tablet width.
- Verify file picking, ad action sheet, frame selection/add/reorder, all six editor sheets, preview element selection, play/format switching, channel selection, GIF options, export action, and safe-area bars.
- Check 1024px and a wider desktop viewport against the current UI to confirm the desktop layout did not change.
- Confirm no page has horizontal document scrolling, no controls or text overlap, no input zoom risk, and no runtime or build errors.
