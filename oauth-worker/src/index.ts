// GitHub OAuth proxy for Decap CMS (public/cms/config.yml's `backend.base_url`).
// Decap's GitHub backend needs a server to hold the OAuth client secret and complete
// the authorization-code exchange — this is that server, deployed as its own small
// Cloudflare Worker (kept separate from the main site's asset-only Worker).
//
// Flow: Decap opens a popup at /auth -> we redirect to GitHub's authorize screen ->
// GitHub redirects back to /callback with a code -> we exchange it for a token and
// hand it back to the opener window via the postMessage handshake Decap expects.
//
// Secrets (set with `wrangler secret put <name>`):
//   GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET — from the GitHub OAuth App.

export interface Env {
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

// Only these origins may receive the GitHub token (the CMS lives at /cms/ on the site).
export const ALLOWED_ORIGINS: readonly string[] = [
  "https://actorslines.app",
  "https://www.actorslines.app",
];

// Public website repo: `public_repo` is enough for Decap to commit KB changes.
const OAUTH_SCOPE = "public_repo";

const STATE_COOKIE = "__Host-oauth_state";
const ORIGIN_COOKIE = "__Host-oauth_origin";
const COOKIE_ATTRS = "Path=/; HttpOnly; Secure; SameSite=Lax";

// Origin of the page that opened the popup, from Referer (site sends origin on
// cross-origin navigations: Referrer-Policy strict-origin-when-cross-origin).
// Returns null unless it is on the allowlist.
export function allowedOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const origin = new URL(referer).origin;
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clearCookies(headers: Headers): void {
  for (const name of [STATE_COOKIE, ORIGIN_COOKIE]) {
    headers.append("Set-Cookie", `${name}=; ${COOKIE_ATTRS}; Max-Age=0`);
  }
}

/** Callback failure: plain-text body, and both flow cookies cleared so a retry starts clean. */
function callbackError(message: string, status: number): Response {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });
  clearCookies(headers);
  return new Response(message, { status, headers });
}

function readCookie(request: Request, name: string): string | null {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

function scriptSafe(json: string): string {
  return json.replace(/</g, "\\u003c");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const openerOrigin = allowedOriginFromReferer(request.headers.get("Referer"));
      if (!openerOrigin) {
        return new Response("Forbidden origin.", { status: 403 });
      }
      const state = crypto.randomUUID();
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", OAUTH_SCOPE);
      authorizeUrl.searchParams.set("state", state);
      const headers = new Headers({ Location: authorizeUrl.toString() });
      headers.append("Set-Cookie", `${STATE_COOKIE}=${state}; ${COOKIE_ATTRS}; Max-Age=600`);
      headers.append(
        "Set-Cookie",
        `${ORIGIN_COOKIE}=${encodeURIComponent(openerOrigin)}; ${COOKIE_ATTRS}; Max-Age=600`,
      );
      return new Response(null, { status: 302, headers });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const expectedState = readCookie(request, STATE_COOKIE);
      if (!code || !state || !expectedState || !timingSafeEqual(state, expectedState)) {
        return callbackError("Invalid or missing OAuth state.", 400);
      }
      // Origin was validated at /auth and travels in a Host-bound cookie; re-check it
      // against the allowlist before any token is requested or sent.
      const cookieOrigin = readCookie(request, ORIGIN_COOKIE);
      let targetOrigin: string | null = null;
      try {
        targetOrigin = cookieOrigin ? decodeURIComponent(cookieOrigin) : null;
      } catch {
        // malformed percent-encoding in the cookie: treat as a forbidden origin
      }
      if (!targetOrigin || !ALLOWED_ORIGINS.includes(targetOrigin)) {
        return callbackError("Forbidden origin.", 403);
      }

      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_OAUTH_CLIENT_ID,
          client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = (await tokenResp.json()) as TokenResponse;
      if (!tokenData.access_token) {
        return callbackError(
          `GitHub token exchange failed: ${tokenData.error_description ?? tokenData.error ?? "unknown error"}`,
          502,
        );
      }

      // Decap/Netlify CMS popup handshake: announce readiness, wait for the opener's
      // acknowledgement, then send the token only to the allowlisted origin that
      // started the flow (explicit targetOrigin, and the ack must come from it).
      const successMessage = `authorization:github:success:${JSON.stringify({
        token: tokenData.access_token,
        provider: "github",
      })}`;
      const html = `<!doctype html>
<html><body>
<script>
(function () {
  var message = ${scriptSafe(JSON.stringify(successMessage))};
  var target = ${scriptSafe(JSON.stringify(targetOrigin))};
  function receiveMessage(e) {
    if (e.origin !== target || e.source !== window.opener) return;
    window.opener.postMessage(message, target);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", target);
})();
</script>
</body></html>`;
      const headers = new Headers({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      });
      clearCookies(headers);
      return new Response(html, { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
