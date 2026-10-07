# Branded service-unavailable page

## What will change
- Replace the raw-looking failure screen the application can control with a calm, branded page.
- Show the correct Aimanté or Gravity Pants name based on the visitor’s domain.
- Include a clear “Try again” action, a home link, and a service-status link.
- Use the same design for server failures and in-app page failures so users get one consistent experience.
- Keep the fallback self-contained so it still renders when the main application cannot load.

## Important limitation
If Lovable’s hosting fails before this project receives the request, the platform’s raw JSON response cannot be replaced by project code. This page covers failures after the request reaches the site.

## Verification
- Check both Aimanté and Gravity Pants variants in the preview.
- Confirm the fallback HTML remains valid and the project builds cleanly.
