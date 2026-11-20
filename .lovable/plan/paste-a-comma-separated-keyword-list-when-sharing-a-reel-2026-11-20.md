# Paste a comma-separated keyword list when sharing a reel

## Problem
In the share step, the Keywords box only turns text into a keyword when you type a comma or press Enter one at a time. Pasting a whole list like "mohair bandana, knit bandana scarf, free knitting pattern, ..." becomes one long keyword that gets cut off at 40 characters.

## What changes
- Pasting (or typing) a comma-separated list splits it into separate keyword chips, one per phrase: "mohair bandana", "knit bandana scarf", "free knitting pattern", "Paintbrush Mohair", and so on.
- Extra spaces are trimmed, empty pieces and duplicates are skipped.
- Works with commas, semicolons and line breaks, so lists copied from a spreadsheet or notes also split.
- Keeps the current limits: up to 20 keywords, each up to 40 characters. Your 13-keyword example fits.
- The hint changes to "Add keywords, separated by commas".

## Technical details
- `src/components/directory/ShareStep.tsx`: replace `addTag` with `addTags(raw)` that splits on `/[,;\n]+/`, trims, lowercases (existing behavior), dedupes against current tags, caps at 20. Call it from an `onPaste` handler (preventDefault, read clipboard text), from `onChange` when the value contains a separator (keep the trailing unfinished piece as the draft), from Enter, and from blur.
- Extract the split function into a small helper and add a test in `tests/` using the user's example string (13 keywords, exact values, cap at 20, duplicates dropped).
- No backend or validation changes needed.
