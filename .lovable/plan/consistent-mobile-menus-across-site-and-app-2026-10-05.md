# Consistent mobile menus across site and app

## The problem

The marketing site and the app use two completely different mobile menu patterns:

- **Site** (`SiteShell.tsx`): full-screen overlay that slides down under the header, big 24px links with divider lines, X to close.
- **App** (`AppHeader.tsx`): a bottom drawer ("Menu" title, small 12px-high rows), plus a *second* bottom drawer for search.

Different gestures, different look, different close behavior — confusing when moving between the two.

## Recommendation

Adopt **one shared pattern: the full-screen overlay menu** (the site's current style) for both, since it's roomier, easier to tap, and already matches the brand's calm, spacious feel. The app's bottom drawers go away.

## What changes

### 1. Shared menu look and behavior (both sides)
- Hamburger (Menu icon) in the header, below `lg` width — already true on both.
- Tapping opens a full-screen panel under the header; the icon becomes an X; body scroll locks.
- Same row style everywhere: full-width rows, 24px semibold labels, hairline dividers, min 56px tap height.
- Same close behaviors: tap X, tap a link, or navigate.

### 2. App mobile menu (`AppHeader.tsx`) rebuilt to match
- Replace the bottom `Drawer` with the full-screen overlay.
- Rows, in order: **Search your ads** (opens the search field inline at the top of the menu instead of a separate drawer), **Your Ads**, **Brand Kit**, **Previous Exports**, **Website**.
- Active page highlighted (filled background, like desktop nav).
- Below the links, a quieter section with: workspace switcher list, trial status, Help, and the account menu — visually secondary (smaller, muted) so the main navigation reads first.

### 3. Site mobile menu (`SiteShell.tsx`) — minor alignment
- Keep the existing overlay; adjust row heights/typography tokens so both menus use identical values.
- Signed-in users already get "Open app" as the first row — keep that.

### 4. Shared building block
- Extract the overlay menu (open state, scroll lock, row component) into one shared component, e.g. `src/components/MobileNavMenu.tsx`, used by both headers so they can't drift apart again.

## Technical notes
- Files touched: `src/components/stillframe/AppHeader.tsx`, `src/components/site/SiteShell.tsx`, new `src/components/MobileNavMenu.tsx`.
- The search drawer in the app is removed; search becomes a field at the top of the app menu.
- No changes to desktop/tablet breakpoints: hamburger still shows below `lg` (1024px) on both.
- Verified in browser at phone (393px) and tablet (834px) widths on both a marketing page and an app page.
