# Rules for this folder
- The Google Fonts list comes from the `listGoogleFonts` server function (`src/lib/stillframe/fonts.functions.ts`, 24h in-memory cache, secret GOOGLE_FONTS_API_KEY) with a built-in fallback list — the stack uses server functions, not edge functions.
