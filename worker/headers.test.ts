import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The admin Attachments card loads private-bucket signed URLs straight from Supabase Storage into
// <img> and <audio>. The site CSP must allow exactly that origin for img-src and media-src.
const SUPABASE_ORIGIN = "https://dicywovaxxuwnkidinpn.supabase.co";

const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const cspLine = headers.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:")) ?? "";
const directives = new Map(
  cspLine
    .replace(/^\s*Content-Security-Policy:\s*/, "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values] as const;
    }),
);

test("site CSP allows the exact Supabase origin for img-src", () => {
  const v = directives.get("img-src") ?? [];
  assert.ok(v.includes(SUPABASE_ORIGIN));
  assert.ok(v.includes("'self'") && v.includes("data:"));
});

test("site CSP allows the exact Supabase origin for media-src", () => {
  const v = directives.get("media-src") ?? [];
  assert.ok(v.includes(SUPABASE_ORIGIN));
});

test("img-src and media-src carry no wildcard or bare scheme source", () => {
  for (const name of ["img-src", "media-src"]) {
    for (const src of directives.get(name) ?? []) {
      assert.ok(!src.includes("*"), `${name} ${src}`);
      assert.ok(src !== "https:" && src !== "http:", `${name} ${src}`);
    }
  }
});
