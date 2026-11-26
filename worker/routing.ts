// Routing logic for actorslines.app (Cloudflare Workers + static assets).
// Runs before the asset layer (wrangler.jsonc `run_worker_first`) to:
//   1. force https and one canonical host (301),
//   2. return a real 404 for missing files instead of the SPA shell,
//   3. inject a per-path <link rel="canonical"> into HTML responses.
// Page routes (no file extension, not under /.well-known/) keep the SPA fallback: known routes
// get the shell with 200, unknown ones the same shell with 404 so the React NotFound view renders.

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
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
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

/**
 * Every path pattern the SPA renders (mirror of the <Route path> values in src/App.tsx, minus the
 * "*" catch-all). ":x" matches exactly one non-empty segment. worker/routing.test.ts fails when
 * App.tsx gains a route that is missing here, so a new page cannot silently 404.
 */
export const KNOWN_ROUTES: readonly string[] = [
  "/",
  "/mobile-captcha",
  "/privacy",
  "/delete-account",
  "/terms",
  "/_ui-gallery",
  "/tutorials",
  "/features",
  "/faq",
  "/support",
  "/beta",
  "/login",
  "/register",
  "/notify/:action/:token",
  "/invite/:token",
  "/reset-password",
  "/update-password",
  "/kb",
  "/kb/:slug",
  "/profile",
  "/requests",
  "/requests/new",
  "/requests/:id",
  "/board",
  "/board/:id",
  "/learn-lines",
  "/learn-lines/:scriptId",
  "/admin",
  "/admin/requests/:id",
  "/admin/invites",
  "/admin/licences",
  "/admin/licences/:userId",
  "/admin/telemetry",
  "/admin/beta",
  "/admin/beta/:id",
];

const splitPath = (p: string) => p.split("/").filter((s) => s !== "");

/**
 * The known route that serves this path, or null. Case-insensitive on static segments and
 * trailing-slash tolerant, like react-router's default matching.
 */
export function matchRoute(pathname: string): string | null {
  const parts = splitPath(pathname);
  for (const route of KNOWN_ROUTES) {
    const pattern = splitPath(route);
    if (pattern.length !== parts.length) continue;
    if (pattern.every((seg, i) => seg.startsWith(":") || seg === parts[i].toLowerCase())) return route;
  }
  return null;
}

export function isKnownRoute(pathname: string): boolean {
  return matchRoute(pathname) !== null;
}

export function canonicalUrl(pathname: string): string {
  let path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const route = matchRoute(pathname);
  if (route) {
    // Static segments use the route's own (lowercase) spelling so /Features is not a duplicate of
    // /features; parameter segments (tokens, ids) keep the caller's case.
    const parts = splitPath(pathname);
    const lowered = splitPath(route).map((seg, i) => (seg.startsWith(":") ? parts[i] : seg));
    path = "/" + lowered.join("/");
  }
  return `https://${CANONICAL_HOST}${path || "/"}`.replace(/&/g, "&amp;");
}

function withCanonicalLink(res: Response, pathname: string): Response {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  const href = canonicalUrl(pathname);
  // An unknown page (404) is not a canonical page: strip the shell's link and add none.
  const rewriter = new HTMLRewriter().on('link[rel="canonical"]', { element: (el: { remove(): void }) => el.remove() });
  if (res.status !== 404) {
    rewriter.on("head", { element: (el: { append(c: string, o: { html: boolean }): void }) => el.append(`<link rel="canonical" href="${href}">`, { html: true }) });
  }
  return rewriter.transform(res);
}

// Decap CMS needs a looser script/connect policy than the public site. Browsers enforce every
// Content-Security-Policy header, so a second /cms/* policy in public/_headers would be merged
// with the site-wide one and the stricter script-src would block unpkg. The /cms policy lives
// only here and replaces the site-wide header. Do not add a /cms/* CSP to public/_headers.
// 'unsafe-eval' is here only because Decap 3.14.1 validates its config with ajv (new Function;
// decap-cms issue #2138). It must never appear in the site-wide CSP.
export const CMS_CSP =
  "default-src 'self' https:; script-src 'self' https://unpkg.com 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

export function isCmsPath(pathname: string): boolean {
  return pathname === "/cms" || pathname.startsWith("/cms/");
}

function withCmsCsp(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.delete("content-security-policy");
  headers.set("content-security-policy", CMS_CSP);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  const target = canonicalRedirect(url);
  if (target) return Response.redirect(target, 301);

  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) {
    return withCanonicalLink(isCmsPath(url.pathname) ? withCmsCsp(res) : res, url.pathname);
  }

  if ((request.method === "GET" || request.method === "HEAD") && isPageRoute(url.pathname)) {
    const shell = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    // Conditional request answered 304 (no body): pass it through, never rebuild it as a 200.
    if (shell.status !== 200) return shell;
    const status = isKnownRoute(url.pathname) ? 200 : 404;
    return withCanonicalLink(new Response(shell.body, { status, headers: shell.headers }), url.pathname);
  }
  return res;
}


// Hosts that may be indexed. Everything else (workers.dev, preview URLs, localhost) is noindex.
const INDEXABLE_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

export function isIndexableHost(hostname: string): boolean {
  return INDEXABLE_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ""));
}

/**
 * Adds X-Robots-Tag on non-canonical hosts (noindex, nofollow) so previews never enter search indexes.
 */
function withRobotsPolicy(res: Response, hostname: string): Response {
  if (isIndexableHost(hostname)) return res;
  // Response.redirect() and fetched responses can have immutable headers: copy first.
  const headers = new Headers(res.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const res = await route(request, env);
  const { hostname } = new URL(request.url);
  return withRobotsPolicy(res, hostname);
}
