# Full-screen reels on mobile

## What changes
- On phones, tapping any real reel on Home, Examples, or Showcase opens that video in the device’s full-screen player instead of visiting the brand website.
- Keep brand-link behavior on larger screens, including the separate “Visit brand” links in Showcase.
- Apply the same full-screen behavior to the featured reel and before-and-after reel videos.

## Implementation
- Add a shared mobile reel interaction to the existing video component. It will detect a phone-sized screen, prevent the surrounding brand link, and request native video full-screen playback, including the iPhone-specific video full-screen API.
- Leave lazy loading, autoplay, reduced-motion behavior, posters, and desktop links unchanged.
- Verify the interaction at phone and desktop sizes across Home, Examples, and Showcase, then confirm the preview builds cleanly.
