# Choose which frames appear in template previews

## What you'll get
- In the admin template builder, each slide gets a **"Show in preview"** toggle (on by default).
- Template previews — the /app/templates grid cards and the big preview on the "Make it yours" page — only play the slides you leave switched on.
- Ads made from the template still use **all** slides; this only affects previews.
- Existing templates keep showing all frames until you turn some off.

## How it works
1. **Data**: add an optional `preview: boolean` to each slide in the template doc (`src/lib/stillframe/template-doc.ts`). Missing means `true`, so all existing templates behave as today. Validation in `admin-templates.functions.ts` accepts the new field.
2. **Builder UI** (`admin/templates.$id.edit.tsx`): a "Show in preview" switch on each slide card, defaulting on. Guard so at least one slide stays on (can't turn off the last one).
3. **Preview rendering** (`templateProject` in `src/components/templates/TemplateRender.tsx`): filter out slides with `preview: false` when building the throwaway preview project, so grid stills and hover animations both use only the chosen frames. `customizedProject` (the "Make it yours" overlay) keeps all slides so customer text/photos map to every slide.

## Notes
- No database migration needed — slides are stored as JSON and the new field is optional.
- Verified after: toggle frames off on a template, confirm the grid card and "Make it yours" preview only show the chosen frames, and that a new ad from the template still contains every slide.
