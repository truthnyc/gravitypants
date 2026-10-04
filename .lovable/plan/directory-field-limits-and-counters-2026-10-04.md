# Directory field limits and counters

## What will change
- Limit brand page addresses to 3–30 lowercase letters, numbers, or hyphens in brand and admin settings.
- Limit brand names to 50 characters wherever brands or admins edit them.
- Expand brand descriptions to 300 characters in account and admin settings; keep them in the public page header.
- Make the Share step’s description reel-specific, limited to 120 characters, rather than overwriting the brand-page description.
- Show a live `current / maximum` counter for each of these fields and change the counter to amber near its limit.

## Data changes
- Add a separate description field to each Directory reel.
- Update database limits for brand names, brand descriptions, and page addresses.
- Preserve existing brand descriptions and existing reel listings.

## Validation and display
- Apply the same limits in the browser, protected server actions, and database.
- Return the reel description in Directory search and brand-page results so each reel card and detail view uses its own text.
- Verify brand settings, Share, admin editing, and public Directory pages on desktop and mobile.
