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

`src/lib/stillframe/guide.ts` will hold the section order, IDs, headings, numbered instructions, tips, illustration keys, coming-soon status, link labels/destinations and support action, plus the small FAQ collection reused by `/app/help`. Keep editorial content out of the presentation components. Import existing trial/plan/size constants rather than creating another list of prices or limits.

| # | Section | Coverage and destination |
| --- | --- | --- |
| 1 | Before you start | Still photos become short MP4 videos or animated GIFs. Explain the usage-based trial and recommend clear photos with room around the subject. **Start a reel → `/app/new`**. |
| 2 | Make your first reel | **Format → Photos**: choose a main size, optional template/kit, add 3–5 photos and arrange their order. Explain that custom dimensions come later at Export. **Start a reel → `/app/new`**. |
| 3 | Edit your reel | Frame rail, preview stage, Inspector Photo/Text/Logo controls; headline/subline, fonts, colours, framing and motion; frame timing/transitions, undo, autosave and the phone layout. Explain main size versus temporary preview size. **Open Your Ads → `/app/ads`**. |
| 4 | Start from a template | Preview a template, supply photos, edit words; reusable kits offer “Make another from this kit”. **Open Templates → `/app/templates`**. |
| 5 | Set up your brand kit | Logo versions for light/dark photos, colours and Google fonts; selecting a kit, saving changes and adjusting logo visibility per frame in Edit. **Open Brand Kit → `/app/brand`**. |
| 6 | Export your files | MP4 for video destinations, GIF for email/compatible placements; main and additional sizes, crop checks, custom size, quality and approximate file-size estimates. One export can produce multiple files. Previous exports remain downloadable for 30 days; deleting files does not refund customer export usage. **Previous Exports → `/app/exports`**. |
| 7 | Share your reel | Download for use elsewhere; explain the optional Share step, private-by-default submission control, description and explicit permission/review. Keep this concise; no Directory/Aimanté destination links and no social-posting promise. **Open Your Ads → `/app/ads`**. |
| 8 | Work with your team | Team plan, owner/admin invitations from **Account → Team**, shared kits/templates and workspace switching. **Open Team → `/app/account/members`** with a clear plan/role note. |
| 9 | Read your brand stats | Views, saves, website clicks, date ranges and estimated revenue; Business/Team availability and an honest no-data explanation. **Open Brand stats → `/app/stats`**. |
| 10 | Aimanté directory | **Coming soon** badge, brief description and one preview illustration; no deep link or activation action. |
| 11 | Shopify | **Coming soon** badge, brief description and one product-to-reel illustration; no deep link or activation action. |
| 12 | Plans and billing | Trial, upgrades, included exports, top-ups and Manage billing. Reuse the existing plan/pack definitions; explain owner/admin control and that Manage billing appears when a billing account is available. **Open Billing → `/app/account/billing`**. |
| 13 | Troubleshooting and support | Photo upload problems, crop/text fit, font-loading failures, large GIFs and exhausted exports; short practical remedies. **Contact support** opens the existing `ContactSupportDialog` with its existing topic/message/attachment flow. |

The trial answer shared with `/app/help` will be: **“No time limit and no card. You get 3 exports: the first without a watermark, then 2 more with a small Gravity Pants mark.”** Counts will be sourced from the existing trial configuration.

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

- Signed out: `/app/guide` redirects to sign-in and returns there after authentication. Signed in: guide uses the normal header/footer and all 13 sections render.
- Confirm `noindex`, unique metadata and absence from the sitemap; no public mirror is created.
- Exercise both entry points, all app destinations, direct section fragments, desktop contents and mobile dropdown, including keyboard focus and back/forward behaviour.
- Open the existing support dialog from the guide, verify close/reopen and fields, without sending a real support ticket merely for testing.
- Check 375px, 768px and 1440px layouts, sticky offsets, long headings, mockups and reduced-motion mode; inspect screenshots for overlap and overflow.
- Confirm shared Help/trial output against the existing trial constants and live rule already inspected. Run the relevant existing rule tests; do not add brittle tests of prose, styling or screenshots. No business rules are changing.
- Check the preview’s error signals before reporting completion.