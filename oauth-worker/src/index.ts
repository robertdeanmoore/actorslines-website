// GitHub OAuth proxy for Decap CMS (public/admin/config.yml's `backend.base_url`).
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

function readCookie(request: Request, name: string): string | null {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", "repo");
      authorizeUrl.searchParams.set("state", state);
      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl.toString(),
          "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
      });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const expectedState = readCookie(request, "oauth_state");
      if (!code || !state || !expectedState || state !== expectedState) {
        return new Response("Invalid or missing OAuth state.", { status: 400 });
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
        return new Response(
          `GitHub token exchange failed: ${tokenData.error_description ?? tokenData.error ?? "unknown error"}`,
          { status: 502 },
        );
      }

      // Standard Decap/Netlify CMS popup handshake: announce readiness, wait for the
      // opener's acknowledgement, then send the token back to that same origin.
      const successMessage = `authorization:github:success:${JSON.stringify({
        token: tokenData.access_token,
        provider: "github",
      })}`;
      const html = `<!doctype html>
<html><body>
<script>
(function () {
  var message = ${JSON.stringify(successMessage)};
  function receiveMessage(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
