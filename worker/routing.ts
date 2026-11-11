// Routing logic for actorslines.app (Cloudflare Workers + static assets).
// Runs before the asset layer (wrangler.jsonc `run_worker_first`) to:
//   1. force https and one canonical host (301),
//   2. return a real 404 for missing files instead of the SPA shell,
//   3. inject a per-path <link rel="canonical"> into HTML responses.
// Page routes (no file extension, not under /.well-known/) keep the SPA fallback.

export const CANONICAL_HOST = "actorslines.app";

// Hosts that must redirect to the canonical origin. Preview URLs and localhost are left alone.
const REDIRECT_HOSTS = new Set([
  "www.actorslines.app",
  "actorslines-website.robertdeanmoore.workers.dev",
]);

// Provided by the Workers runtime (no @cloudflare/workers-types dependency).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const HTMLRewriter: any;

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Where this request must be redirected to, or null if it is already canonical. */
export function canonicalRedirect(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host !== CANONICAL_HOST && !REDIRECT_HOSTS.has(host)) return null;
  if (host === CANONICAL_HOST && url.protocol === "https:") return null;
  return `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
}

/** True when a miss should fall back to the SPA shell (a page route, not a file or well-known path). */
export function isPageRoute(pathname: string): boolean {
  if (pathname === "/.well-known" || pathname.startsWith("/.well-known/")) return false;
  const last = pathname.split("/").pop() ?? "";
  return !last.includes(".");
}

export function canonicalUrl(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return `https://${CANONICAL_HOST}${path || "/"}`;
}

function withCanonicalLink(res: Response, pathname: string): Response {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  const href = canonicalUrl(pathname);
  return new HTMLRewriter()
    .on('link[rel="canonical"]', { element: (el: { remove(): void }) => el.remove() })
    .on("head", { element: (el: { append(c: string, o: { html: boolean }): void }) => el.append(`<link rel="canonical" href="${href}">`, { html: true }) })
    .transform(res);
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  const target = canonicalRedirect(url);
  if (target) return Response.redirect(target, 301);

  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return withCanonicalLink(res, url.pathname);

  if ((request.method === "GET" || request.method === "HEAD") && isPageRoute(url.pathname)) {
    const shell = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    return withCanonicalLink(new Response(shell.body, { status: 200, headers: shell.headers }), url.pathname);
  }
  return res;
}

