# Editor photo defaults and admin template media controls

## Outcome

- New ads will start with **Darken for text** turned off on every photo.
- Admins can crop and zoom each template slide’s sample photo by dragging it and adjusting scale.
- That saved crop becomes the starting crop when a customer adds their own photo to the slide.
- Admins can upload a default logo for a template, position and size it, and see it in the live preview.
- Ads created from that template start with its logo; customers can replace or adjust it in the normal editor.

## Changes

### 1. Turn photo darkening off by default

- Change every ad-creation path that currently enables `darken_for_text` automatically:
  - photos-first ads,
  - ready-made template ads,
  - example/gallery-created ads.
- Keep the existing editor toggle so a user can deliberately turn darkening on.
- Do not rewrite existing saved ads; their explicit saved choice remains intact.

### 2. Save per-slide crop and zoom in templates

- Extend each template slide’s saved JSON with normalized crop focus and zoom values.
- Default older templates to centered focus and 1× zoom, requiring no database column change.
- Add an image-adjustment view to the expanded slide card:
  - drag the image to choose the visible area,
  - use a zoom control within the renderer’s supported 1×–3× range,
  - replace, remove, and reset the crop.
- Feed these values through the existing shared `renderAt()` path so the builder preview and generated thumbnail match the eventual ad.
- Copy the saved focus and zoom into customer frames when they add photos, so their photos begin with the template’s intended composition.

### 3. Add a replaceable template logo

- Extend the template style JSON with an optional uploaded logo plus size, opacity, and position settings.
- Reuse the protected system-template media upload flow and validate supported image type and size server-side.
- Add logo upload/replace/remove, size, opacity, and position controls to the Style section.
- Load the logo with the other preview assets and draw it through `renderAt()` in both live preview and generated thumbnails.
- Copy the logo settings into new ads made from the template. The normal editor’s existing logo controls remain available, allowing customers to replace it with their own logo or Brand Kit choice.
- Existing templates without a logo continue to work unchanged.

## Technical details

- Update the template document types, defaults, server validation, draft/publish serialization, and template-to-ad conversion together.
- Store crop and logo metadata in the templates table’s existing JSON fields; no schema migration is required.
- Preserve draft/version behavior: published templates do not change for customers until an admin publishes the new version, and existing ads remain unchanged.
- Keep all media private and resolve it through the existing media URL helper.
- Do not add a second drawing implementation; preview, thumbnail generation, editor, and export continue using the shared renderer.

## Verification

- Confirm newly created ads from each creation path show **Darken for text** off on every slide.
- In the admin builder, upload a portrait and landscape sample, drag and zoom each, save, reload, and confirm the crop persists.
- Create an ad from the template, add customer photos, and confirm the saved crop/zoom is applied as the starting composition.
- Upload a template logo, adjust it, save/reload, generate a thumbnail, and confirm all previews match.
- Create an ad from the template and confirm its logo is present and replaceable in the regular editor.
- Check desktop and phone layouts, type safety, tests, and the latest preview build result.
