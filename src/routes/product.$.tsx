import { createFileRoute } from "@tanstack/react-router";

/** Permanently removed section: real HTTP 410 Gone for /product/*, never a redirect or 404. */
function gone(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page removed — Gravity Pants</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f5f5f7;color:#1d1d1f}main{text-align:center;padding:2rem;max-width:28rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#6e6e73;margin:0 0 1.5rem}a{display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:.75rem 1.25rem;border-radius:8px}</style>
</head>
<body>
<main>
<h1>This page has been permanently removed</h1>
<p>It won't be coming back, but everything else is still here.</p>
<a href="/">Go to the Gravity Pants homepage</a>
</main>
</body>
</html>`,
    {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}

export const Route = createFileRoute("/product/$")({
  server: {
    handlers: {
      GET: () => gone(),
      HEAD: () => gone(),
      POST: () => gone(),
      PUT: () => gone(),
      PATCH: () => gone(),
      DELETE: () => gone(),
    },
  },
});
