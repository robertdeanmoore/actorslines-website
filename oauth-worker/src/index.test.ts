// Run: node --test oauth-worker/src/index.test.ts (Node >= 22.18, native TS stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { allowedOriginFromReferer, timingSafeEqual } from "./index.ts";

const env = { GITHUB_OAUTH_CLIENT_ID: "cid", GITHUB_OAUTH_CLIENT_SECRET: "sec" };
const base = "https://actorslines-cms-auth.example.workers.dev";

test("referer allowlist", () => {
  assert.equal(allowedOriginFromReferer("https://actorslines.app/cms/"), "https://actorslines.app");
  assert.equal(allowedOriginFromReferer("https://www.actorslines.app/"), "https://www.actorslines.app");
  assert.equal(allowedOriginFromReferer("https://evil.example/"), null);
  assert.equal(allowedOriginFromReferer("https://actorslines.app.evil.example/"), null);
  assert.equal(allowedOriginFromReferer("http://actorslines.app/"), null);
  assert.equal(allowedOriginFromReferer(null), null);
  assert.equal(allowedOriginFromReferer("not a url"), null);
});

test("timingSafeEqual", () => {
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
  assert.equal(timingSafeEqual("abc", "ab"), false);
});

test("/auth rejects missing or foreign referer", async () => {
  for (const referer of [undefined, "https://evil.example/"]) {
    const headers: Record<string, string> = referer ? { Referer: referer } : {};
    const r = await worker.fetch(new Request(`${base}/auth`, { headers }), env);
    assert.equal(r.status, 403);
    assert.equal(r.headers.get("Set-Cookie"), null);
  }
});

test("/auth from allowed origin redirects with public_repo and cookies", async () => {
  const r = await worker.fetch(
    new Request(`${base}/auth`, { headers: { Referer: "https://actorslines.app/cms/" } }),
    env,
  );
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get("Location")!);
  assert.equal(loc.searchParams.get("scope"), "public_repo");
  assert.ok(loc.searchParams.get("state"));
  const cookies = r.headers.getSetCookie().join("\n");
  assert.match(cookies, /__Host-oauth_state=/);
  assert.match(cookies, /__Host-oauth_origin=https%3A%2F%2Factorslines\.app/);
});

test("/callback rejects state mismatch, missing or non-allowlisted origin before token exchange", async () => {
  const realFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("must not be called");
  }) as typeof fetch;
  try {
    const cases: Array<[string, number]> = [
      ["__Host-oauth_state=aaa; __Host-oauth_origin=https%3A%2F%2Factorslines.app", 400],
      ["__Host-oauth_state=bbb", 403],
      ["__Host-oauth_state=bbb; __Host-oauth_origin=https%3A%2F%2Fevil.example", 403],
    ];
    for (const [cookie, status] of cases) {
      const r = await worker.fetch(
        new Request(`${base}/callback?code=c&state=bbb`, { headers: { Cookie: cookie } }),
        env,
      );
      assert.equal(r.status, status, cookie);
    }
    assert.equal(called, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("/callback success pins postMessage to the allowlisted origin", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ access_token: "tok</script>" }))) as typeof fetch;
  try {
    const r = await worker.fetch(
      new Request(`${base}/callback?code=c&state=s1`, {
        headers: { Cookie: "__Host-oauth_state=s1; __Host-oauth_origin=https%3A%2F%2Fwww.actorslines.app" },
      }),
      env,
    );
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes('"https://www.actorslines.app"'));
    assert.ok(!html.includes("e.origin);"));
    assert.ok(!html.includes('"*"'));
    assert.ok(!html.includes("</script>\\"), "no raw </script> inside payload");
    assert.equal(html.split("</script>").length, 2);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("/callback with malformed percent-encoding in origin cookie returns 403, not a throw", async () => {
  const r = await worker.fetch(
    new Request(`${base}/callback?code=c&state=s1`, {
      headers: { Cookie: "__Host-oauth_state=s1; __Host-oauth_origin=%E0%A4%A" },
    }),
    env,
  );
  assert.equal(r.status, 403);
});

test("/callback error responses clear both flow cookies", async () => {
  const r = await worker.fetch(
    new Request(`${base}/callback?code=c&state=bbb`, { headers: { Cookie: "__Host-oauth_state=aaa" } }),
    env,
  );
  assert.equal(r.status, 400);
  const cookies = r.headers.getSetCookie().join("\n");
  assert.match(cookies, /__Host-oauth_state=; .*Max-Age=0/);
  assert.match(cookies, /__Host-oauth_origin=; .*Max-Age=0/);
});
