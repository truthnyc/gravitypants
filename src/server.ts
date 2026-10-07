import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { domainRedirect } from "./lib/site/brand-site";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response, host: string | null, isDocumentRequest: boolean): Promise<Response> {
  if (response.status < 500) return response;
  if (!isDocumentRequest) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage({ host }), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { error?: unknown; status?: unknown; unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && (payload.message === "HTTPError" || payload.error === true || payload.status === 500);
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const isDocumentRequest = (request.method === "GET" || request.method === "HEAD") && (request.headers.get("accept") ?? "").includes("text/html");
    // Page visits on the wrong domain go to the right one (only real domains; previews are untouched).
    if (isDocumentRequest) {
      // Hosting may preserve its internal URL and expose the visitor's real domain in this header.
      // Resolve that domain here so the redirect happens before TanStack renders any HTML.
      const to = domainRedirect(request.url, forwardedHost);
      if (to) return Response.redirect(to, 301);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, forwardedHost, isDocumentRequest);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage({ host: forwardedHost }), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
