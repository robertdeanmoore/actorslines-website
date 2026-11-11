import { test } from "node:test";
import assert from "node:assert/strict";
import { CMS_CSP, canonicalRedirect, canonicalUrl, handle, isCmsPath, isPageRoute } from "./routing.ts";

const u = (s: string) => new URL(s);

test("http canonical host redirects to https", () => {
  assert.equal(canonicalRedirect(u("http://actorslines.app/kb?x=1")), "https://actorslines.app/kb?x=1");
});
test("https canonical host does not redirect", () => {
  assert.equal(canonicalRedirect(u("https://actorslines.app/")), null);
});
test("www and workers.dev redirect to canonical", () => {
  assert.equal(canonicalRedirect(u("https://www.actorslines.app/privacy")), "https://actorslines.app/privacy");
  assert.equal(
    canonicalRedirect(u("https://actorslines-website.robertdeanmoore.workers.dev/a?b=c")),
    "https://actorslines.app/a?b=c",
  );
  assert.equal(canonicalRedirect(u("http://WWW.actorslines.app/")), "https://actorslines.app/");
});
test("preview and local hosts untouched", () => {
  assert.equal(canonicalRedirect(u("http://localhost:8787/")), null);
  assert.equal(canonicalRedirect(u("https://abc-actorslines-website.robertdeanmoore.workers.dev/")), null);
});
test("isPageRoute", () => {
  for (const p of ["/", "/kb", "/kb/some-article", "/admin/requests/1"]) assert.equal(isPageRoute(p), true, p);
  for (const p of ["/sitemap.xml", "/llms.txt", "/.well-known/assetlinks.json", "/.well-known/x", "/assets/x.js", "/a/b.png"])
    assert.equal(isPageRoute(p), false, p);
});
test("canonicalUrl strips trailing slash, keeps root", () => {
  assert.equal(canonicalUrl("/"), "https://actorslines.app/");
  assert.equal(canonicalUrl("/kb/"), "https://actorslines.app/kb");
});

test("canonicalUrl escapes ampersand for HTML attribute", () => {
  assert.equal(canonicalUrl("/a&b"), "https://actorslines.app/a&amp;b");
});

function env(files: Record<string, string>) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const p = new URL(req.url).pathname;
        return p in files
          ? new Response(files[p], { headers: { "content-type": "text/plain" } })
          : new Response(null, { status: 404 });
      },
    },
  };
}

test("missing file extension / well-known returns 404", async () => {
  const e = env({ "/": "shell" });
  for (const p of ["/sitemap.xml", "/llms.txt", "/.well-known/assetlinks.json", "/assets/nope.js"]) {
    const r = await handle(new Request("https://actorslines.app" + p), e);
    assert.equal(r.status, 404, p);
  }
});
test("unknown page route falls back to shell with 200", async () => {
  const r = await handle(new Request("https://actorslines.app/kb/whatever"), env({ "/": "shell" }));
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "shell");
});
test("existing asset served", async () => {
  const r = await handle(new Request("https://actorslines.app/robots.txt"), env({ "/robots.txt": "ok" }));
  assert.equal(await r.text(), "ok");
});
test("conditional request on page route passes 304 through with no body", async () => {
  const e = {
    ASSETS: {
      fetch: async (req: Request) => {
        const p = new URL(req.url).pathname;
        if (req.headers.has("if-none-match") && p === "/") return new Response(null, { status: 304 });
        return new Response(null, { status: 404 });
      },
    },
  };
  const r = await handle(new Request("https://actorslines.app/privacy", { headers: { "if-none-match": '"abc"' } }), e);
  assert.equal(r.status, 304);
  assert.equal(await r.text(), "");
});
test("redirect is 301", async () => {
  const r = await handle(new Request("http://actorslines.app/x"), env({}));
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("location"), "https://actorslines.app/x");
});

const SITE_CSP = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'";

// Mimics the asset layer: site-wide headers on every response (as public/_headers does).
function envWithSiteHeaders(files: Record<string, string>) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const p = new URL(req.url).pathname;
        if (!(p in files)) return new Response(null, { status: 404 });
        return new Response(files[p], {
          headers: { "content-type": "text/plain", "content-security-policy": SITE_CSP, "x-frame-options": "DENY" },
        });
      },
    },
  };
}

test("isCmsPath", () => {
  assert.equal(isCmsPath("/cms"), true);
  assert.equal(isCmsPath("/cms/"), true);
  assert.equal(isCmsPath("/cms/config.yml"), true);
  assert.equal(isCmsPath("/cmsx"), false);
  assert.equal(isCmsPath("/kb/cms/"), false);
});
test("/cms/ and /cms/config.yml get exactly one CSP, the cms one, allowing unpkg", async () => {
  const e = envWithSiteHeaders({ "/": "shell", "/cms/": "cms", "/cms/config.yml": "cfg" });
  for (const p of ["/cms/", "/cms/config.yml"]) {
    const r = await handle(new Request("https://actorslines.app" + p), e);
    const csp = r.headers.get("content-security-policy") ?? "";
    assert.equal(csp, CMS_CSP, p);
    assert.ok(csp.includes("https://unpkg.com"), p);
    assert.ok(!csp.includes("challenges.cloudflare.com"), p);
    assert.ok(!csp.includes(","), `${p} single, unmerged policy`);
    assert.equal(r.headers.get("x-frame-options"), "DENY", p);
  }
});
test("non-cms paths keep site CSP and never allow unpkg", async () => {
  const e = envWithSiteHeaders({ "/": "shell", "/robots.txt": "ok" });
  for (const p of ["/", "/robots.txt", "/kb/whatever"]) {
    const r = await handle(new Request("https://actorslines.app" + p), e);
    const csp = r.headers.get("content-security-policy") ?? "";
    assert.equal(csp, SITE_CSP, p);
    assert.ok(!csp.includes("unpkg.com"), p);
  }
});
test("cms miss falling back to shell keeps site CSP", async () => {
  const r = await handle(new Request("https://actorslines.app/cms/nope"), envWithSiteHeaders({ "/": "shell" }));
  assert.equal(r.headers.get("content-security-policy"), SITE_CSP);
});
