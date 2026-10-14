# Getting started with Gravity Pants

## Scope

Build a signed-in tutorial at **`/app/guide`**, titled **“Getting started with Gravity Pants”**. Use the existing app header/footer, controls and semantic colour tokens. Add the two requested entry points and correct the outdated trial answer on `/app/help`. No editor, billing, publishing, Shopify or account-rule changes.

**Planning only for now; no application changes have been made.**

## Corrections to the proposed flow

These points were checked against the current files; the trial was also checked against the live `export_status` function.

| Topic | What the tutorial should say |
| --- | --- |
| First-reel order | `/app/new` opens **Format first**, then **Photos → Edit → Export → Share**. Format includes the main size, an optional template and a brand kit. It currently starts at **4:5**. Sources: `app/new.tsx`, `editor/FormatStep.tsx`. |
| Custom sizes | The initial Format picker offers **9:16, 4:5, 1:1, 16:9 and 5:4**. **Custom dimensions are set on Export**, not Format. Sources: `FormatChooser.tsx`, `ExportPage.tsx`. |
| Photo count | **3–5 photos is a recommendation**, not a minimum or limit. Photos currently allows up to 20. Source: `PhotosStep.tsx`. |
| Trial | No time limit and no card; **3 included exports: first without a watermark, next 2 with a small Gravity Pants mark**. The live function also exempts exports backed by purchased extras from the watermark, so do not claim every later export must be marked. `/app/help` currently gives the wrong duration and watermark rule. |
| Timing | Teach timing and transitions through the **frame rail’s controls**, rather than promising a separate full timeline in the current Edit screen. The active editor renders `FrameRail` and `Inspector`. |
| Templates | “Make another from this kit” applies to **reusable kits**, and carries over words, **not photos**. Source: `KitAgain.tsx`. |
| Brand kit | Store logo versions, colours and fonts in the kit; choose **per-frame logo visibility/version in Edit**, not as a per-frame setting on the Brand Kit page. |
| Team navigation | The account tab/menu label is **Team**, although its address is `/app/account/members`. Use **Account → Team**. Invitations and billing management require the relevant owner/admin permissions. Team includes the owner plus 4 teammates. |
| Stats | `/app/stats` **is Brand stats**, not a separate general ad-performance dashboard. `/app/account/stats` reuses that view. Business and Team have access, with staff access too; figures cover reels on Aimanté and Gravity Pants, not Instagram analytics. Revenue is an estimate. |
| Sharing / coming soon | Share already supports optional Directory submission; Aimanté and Shopify also have existing implementation. Treat **“Coming soon” as tutorial presentation requested here**, not a claim that their code is absent. Keep those two tutorial sections brief, badged and unlinked. Share must not promise direct Instagram posting. |
| Theme | The app currently defines a **light theme**, with no dark theme switch. Illustrations will inherit semantic tokens and remain theme-compatible, without adding dark mode or altering the existing theme. |

## Page and navigation

- Unframed two-column reading layout: sticky table of contents on the left at desktop widths, readable article on the right. Sections separated by spacing/hairlines, not floating cards.
- Below desktop widths, replace the side list with a labelled **“Jump to”** dropdown using the existing Select control. Keep it below the app header without covering headings or content.
- All 13 sections have stable IDs, a short heading, **2–4 numbered instructions**, **one illustrated mockup**, and a short **Tip** callout. The two coming-soon sections use informational steps, not fake setup actions.
- Table of contents and dropdown share the same section list. Selecting an item updates the section fragment and focuses its heading; back/forward and direct section links work. Mark the current section accessibly as the reader scrolls.
- Header-aware scroll offsets, visible keyboard focus, sensible heading hierarchy, 44px mobile targets and no horizontal overflow at 375px.
- Plain, human copy; no invented product capabilities or promotional claims. Use the supplied title and entry labels exactly. Give every new or touched CTA a stable `data-cta` value.
- Deep links use existing app routes. Do not invent an ad ID for Edit/Export/Share: direct those sections to **Your Ads** to choose a reel, and explain the next step in the instructions.

## Shared content: 13 sections

`src/lib/stillframe/guide.ts` holds section IDs/order, headings, instructions, tips, illustration keys, badges, links and support action, plus FAQs reused by `/app/help`. Import existing trial/plan/size constants instead of duplicating prices or limits.

1. **Before you start:** photos → MP4/GIF; usage-based trial; photo preparation. Link: `/app/new`.
2. **First reel:** Format → Photos; five main sizes, optional template/kit, 3–5 recommended photos, ordering. Explain custom sizes at Export. Link: `/app/new`.
3. **Edit:** rail, stage, Photo/Text/Logo Inspector, fonts, colours, framing, motion, timing/transitions, undo, autosave and mobile controls; main versus preview size. Link: `/app/ads`.
4. **Templates:** preview, photos, words, reusable kits and “Make another”. **Open Templates → `/app/templates`**.
5. **Brand kit:** logo versions, colours, Google fonts, saving/selecting a kit; per-frame visibility in Edit. Link: `/app/brand`.
6. **Export:** MP4/GIF, main/additional/custom sizes, crop checks, quality, approximate file estimate; multiple files per export, 30-day downloads. Deleting files does not refund usage. Link: `/app/exports`.
7. **Share:** download; optional Share step, initially private, description, permission/review. No Directory destination links or direct social-posting promises. Link: `/app/ads`.
8. **Team:** owner/admin invites via Account → Team, shared kits/templates and workspace switcher. Link: `/app/account/members`, with plan/role note.
9. **Stats:** views, saves, clicks, date ranges, estimated revenue and empty state; Business/Team availability. Link: `/app/stats`.
10. **Aimanté:** Coming soon badge, brief description and illustration; no deep links.
11. **Shopify:** same coming-soon treatment; no deep links.
12. **Billing:** trial, upgrade, limits, top-ups, Manage billing; current shared plan definitions and owner/admin permissions. Link: `/app/account/billing`.
13. **Troubleshooting:** upload, crop/text fit, fonts, GIF size and exhausted exports; short remedies. **Contact support** opens the existing dialog.

Shared trial answer: **“No time limit and no card. You get 3 exports: the first without a watermark, then 2 more with a small Gravity Pants mark.”** Source counts from existing trial configuration.

## Illustration component breakdown

Use lightweight, static React/SVG diagrams—not screenshots, image downloads, live editor instances or a second rendering engine. All fills, strokes, borders and text inherit existing semantic tokens; no raw colour literals. Diagrams are illustrative, not pretend working controls.

**Reusable primitives** in `GuideIllustrations.tsx`:
- `MockPhoto`: simple geometric subject with token-based Photo/Headline/Subline accents.
- `MockPhone`: aspect-ratio-safe phone/reel frame with photo, headline and logo shapes.
- `MockFrameRail`: selected frame, adjacent thumbnails and timing marks.
- `MockInspector`: Photo/Text/Logo tabs with simplified fields, swatches and sliders.
- `MockFormatChips`: five built-in ratio examples plus a custom-dimensions motif where appropriate.
- `MockExportCard`: MP4/GIF file rows, estimate and download symbol.

**One composed illustration per section**: photo-to-reel/trial; Format-to-Photos; editor rail/stage/Inspector; template gallery; logo/colour/font kit; export files; private/share choice; team/workspace; miniature stats; directory preview; product-to-reel; plan/usage; support message.

Maintain stable view boxes/aspect ratios and readable labels at phone widths. Each figure has an accessible description from the shared content; decorative internals are hidden from assistive technology. Default to no animation. Any optional transition and smooth scrolling must respect reduced motion.

## Files to add/change

### Add
- **`src/lib/stillframe/guide.ts`** — shared tutorial and Help FAQ content, typed section IDs/actions and references to existing product constants.
- **`src/components/guide/GuidePage.tsx`** — article layout, rendering, support-dialog state and composition.
- **`src/components/guide/GuideNavigation.tsx`** — desktop contents, mobile dropdown, current-section tracking and accessible section jumps.
- **`src/components/guide/GuideSection.tsx`** — consistent numbered instructions, Tip, figure, badge and app link rendering.
- **`src/components/guide/GuideIllustrations.tsx`** — small diagram primitives and the 13 compositions.
- **`src/routes/_authenticated/app/guide.tsx`** — route ID `/_authenticated/app/guide`, using the existing authenticated parent and normal shell. Unique title/description, matching Open Graph text, `og:type`, `twitter:card` and **`robots: noindex`**. No image metadata for bundled diagrams.

### Change
- **`src/components/stillframe/HelpMenu.tsx`** — add **Tutorial** above **Help center**, linking to `/app/guide`; reuse the existing support dialog without changing its submission logic.
- **`src/routes/_authenticated/app/help.tsx`** — add **“New here? Follow the tutorial”** card at the top, after the page heading; replace local FAQ content with the shared content so the trial correction has one source. Retain the existing support button/dialog and page metadata.
- **`AGENTS.md`** — record the shared guide-content and token-based illustration architecture after implementation.
- **`roadmap.md`** — track this build’s tasks when approved.

**No expected changes to `src/styles.css`**: use existing tokens and local utility classes. **No sitemap changes**: its explicit public-page list already excludes `/app/*`. Do not modify generated routing files, add public tutorial routes, or change authentication.

**Entry-point caveat:** `HelpMenu` is desktop-only today, while the phone menu’s Help link opens public `/help`. Keep the requested changes scoped to HelpMenu and `/app/help`; phone users can use the tutorial’s direct URL or its private Help card. A separate phone-menu entry is not included in this plan.

## Verification after approval

- Check signed-out redirect/return and signed-in normal shell with all 13 sections.
- Confirm `noindex`, unique metadata and sitemap exclusion.
- Exercise entry points, app links, fragments, contents/dropdown, keyboard focus and back/forward.
- Open/close the support dialog; do not send a real ticket merely for testing.
- Inspect 375px, 768px and 1440px screenshots for overflow, sticky overlap and illustration clarity; check reduced motion.
- Verify shared trial output against existing constants/rules and run relevant existing tests. No brittle prose/style/snapshot tests; no business-rule changes.
- Check preview error signals before reporting completion.