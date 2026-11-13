import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { handle } from "./routing.ts";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  jsonLdText,
  routeMeta,
  softwareApplicationJsonLd,
} from "../src/lib/routeMeta.ts";

const pub = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url), "utf8");
const kbSlugs = readdirSync(new URL("../src/content/kb/", import.meta.url))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

const PUBLIC_PAGES = ["/", "/kb", "/privacy", "/terms"];
const FILES = { "/robots.txt": "text/plain", "/sitemap.xml": "application/xml", "/llms.txt": "text/plain" } as const;

function env(files: Record<string, string>) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const p = new URL(req.url).pathname;
        return p in files
          ? new Response(files[p], { headers: { "content-type": FILES[p as keyof typeof FILES] ?? "text/html" } })
          : new Response(null, { status: 404 });
      },
    },
  };
}

test("discovery files are served byte for byte, never rewritten", async () => {
  const files = Object.fromEntries(Object.keys(FILES).map((p) => [p, pub(p.slice(1))]));
  for (const p of Object.keys(FILES)) {
    const res = await handle(new Request(`https://actorslines.app${p}`), env(files));
    assert.equal(res.status, 200, p);
    assert.equal(await res.text(), files[p], p);
  }
});

test("a missing discovery file is a real 404, not the SPA shell", async () => {
  for (const p of Object.keys(FILES)) {
    const res = await handle(new Request(`https://actorslines.app${p}`), env({ "/": "<html><head></head></html>" }));
    assert.equal(res.status, 404, p);
  }
});

test("robots.txt: allows the site, blocks account and token routes, points at the sitemap", () => {
  const robots = pub("robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/m);
  for (const p of ["/admin", "/profile", "/requests", "/board", "/learn-lines", "/notify/", "/invite/", "/reset-password", "/update-password", "/cms/"]) {
    assert.match(robots, new RegExp(`^Disallow: ${p}$`, "m"), p);
  }
  assert.match(robots, /^Sitemap: https:\/\/actorslines\.app\/sitemap\.xml$/m);
});

test("sitemap.xml lists exactly the public pages and every KB article, canonical form", () => {
  const xml = pub("sitemap.xml");
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = [...PUBLIC_PAGES, ...kbSlugs.map((s) => `/kb/${s}`)].map((p) => `https://actorslines.app${p}`);
  assert.deepEqual([...locs].sort(), [...expected].sort());
  assert.equal(new Set(locs).size, locs.length, "no duplicates");
  for (const loc of locs) assert.ok(loc === "https://actorslines.app/" || !loc.endsWith("/"), loc);
  for (const hidden of ["/tutorials", "/admin", "/login", "/register", "/profile", "/learn-lines", "/board", "/requests"]) {
    assert.ok(!locs.some((l) => l.includes(hidden)), `${hidden} must not be listed`);
  }
});

test("llms.txt: plain description, no prices, no version, no Rehearse, only canonical links", () => {
  const txt = pub("llms.txt");
  assert.match(txt, /^# Actors Lines$/m);
  assert.doesNotMatch(txt, /[£$€]\s?\d|\d\s?(GBP|USD|EUR|pounds?|dollars?)/i, "no pricing numbers");
  assert.doesNotMatch(txt, /\bprice|pricing|\bfree trial|refund/i);
  assert.doesNotMatch(txt, /\bv?\d+\.\d+\.\d+\b/, "no version number");
  assert.doesNotMatch(txt, /rehears/i);
  const urls = [...txt.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 3);
  const sitemap = pub("sitemap.xml");
  for (const u of urls) assert.ok(sitemap.includes(`<loc>${u}</loc>`), `${u} is a sitemap page`);
});

test("llms.txt: no claims the website contradicts (scripts on device only, on-device speech, synthetic cast)", () => {
  const txt = pub("llms.txt");
  assert.doesNotMatch(txt, /scripts stay on your phone/i);
  assert.doesNotMatch(txt, /on-device speech/i);
  assert.doesNotMatch(txt, /synthetic/i);
  assert.match(txt, /Learn Lines[^.]*server/i);
  assert.match(txt, /speech service/i);
  assert.match(txt, /Scripts you add in the app stay on your phone/);
  assert.doesNotMatch(txt, /natural voices/i);
  assert.match(txt, /computer-generated voices/);
});

test("routeMeta: /privacy, /terms, /login, /register have their own description", () => {
  const kb = () => undefined;
  for (const p of ["/privacy", "/terms", "/login", "/register"]) {
    const m = routeMeta(p, kb);
    assert.notEqual(m.description, DEFAULT_DESCRIPTION, p);
    assert.ok(m.description.length > 10, p);
    assert.doesNotMatch(m.description, /[£$€]\s?\d|rehears/i, p);
  }
});

test("routeMeta: site defaults, static routes, KB articles", () => {
  const kb = (slug: string) => (slug === "demo" ? { title: "Demo article", summary: "A summary." } : undefined);
  assert.deepEqual(routeMeta("/", kb), { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION });
  assert.equal(routeMeta("/privacy", kb).title, "Privacy Policy | Actors Lines");
  assert.equal(routeMeta("/kb/", kb).title, "Knowledge base | Actors Lines");
  assert.deepEqual(routeMeta("/kb/demo", kb), { title: "Demo article | Actors Lines", description: "A summary." });
  assert.deepEqual(routeMeta("/kb/missing", kb), { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION });
  assert.deepEqual(routeMeta("/anything-else", kb), { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION });
});

test("index.html default description matches the module default", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(`content="${DEFAULT_DESCRIPTION}"`));
});

test("JSON-LD: SoftwareApplication with no price, offers, version or rating, Android only, safe to embed", () => {
  const data = softwareApplicationJsonLd();
  assert.equal(data["@type"], "SoftwareApplication");
  for (const key of ["offers", "price", "priceCurrency", "softwareVersion", "aggregateRating", "review", "featureList"]) {
    assert.ok(!(key in data), key);
  }
  assert.equal(data.operatingSystem, "Android");
  const text = jsonLdText(data);
  assert.deepEqual(JSON.parse(text), data);
  assert.doesNotMatch(text, /rehears/i);
  assert.equal(jsonLdText({ a: "</script>" }).includes("</script>"), false);
});
