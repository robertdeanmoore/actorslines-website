import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_THEME, resolveTheme, uiGalleryAllowed } from "../src/lib/theme.ts";

test("night is the shipped default", () => {
  assert.equal(DEFAULT_THEME, "night");
});

test("night is on for any host by default, production included", () => {
  for (const h of ["actorslines.app", "www.actorslines.app", "ActorsLines.App", "preview.example.dev", "localhost"]) {
    assert.equal(resolveTheme(h, "", undefined), "night", h);
  }
});

test("production ignores query and env: it always gets the default", () => {
  assert.equal(resolveTheme("actorslines.app", "?theme=standard", "standard"), "night");
  assert.equal(resolveTheme("www.actorslines.app", "?theme=standard", undefined), "night");
});

test("non-production hosts: ?theme=standard shows the legacy look, ?theme=night forces night", () => {
  assert.equal(resolveTheme("preview.example.dev", "?theme=standard", undefined), "standard");
  assert.equal(resolveTheme("preview.example.dev", "", "standard"), "standard");
  assert.equal(resolveTheme("preview.example.dev", "?theme=night", "standard"), "night");
  assert.equal(resolveTheme("preview.example.dev", "?theme=bogus", undefined), "night");
});

test("rollback: with default standard, production is standard and previews can still force night", () => {
  assert.equal(resolveTheme("actorslines.app", "?theme=night", "night", "standard"), "standard");
  assert.equal(resolveTheme("preview.example.dev", "", undefined, "standard"), "standard");
  assert.equal(resolveTheme("preview.example.dev", "?theme=night", undefined, "standard"), "night");
});

test("/_ui-gallery: hidden on production hosts, open on previews and dev builds", () => {
  assert.equal(uiGalleryAllowed("actorslines.app", false), false);
  assert.equal(uiGalleryAllowed("www.actorslines.app", false), false);
  assert.equal(uiGalleryAllowed("preview.example.dev", false), true);
  assert.equal(uiGalleryAllowed("localhost", true), true);
});

test("index.html paints night before JS runs (data-theme, theme-color, color-scheme)", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<html[^>]*data-theme="night"/);
  assert.match(html, /<meta name="theme-color" content="#120845"/);
  assert.match(html, /<meta name="color-scheme" content="dark"/);
});
