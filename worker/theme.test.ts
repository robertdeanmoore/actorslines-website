import { test } from "node:test";
import assert from "node:assert/strict";
import { nightThemeRequested } from "../src/lib/theme.ts";

test("production hosts are never night, even with VITE_THEME=night", () => {
  assert.equal(nightThemeRequested("actorslines.app", "", "night"), false);
  assert.equal(nightThemeRequested("www.actorslines.app", "", "night"), false);
  assert.equal(nightThemeRequested("ActorsLines.App", "?theme=night", "night"), false);
});

test("production hosts ignore the query flag", () => {
  assert.equal(nightThemeRequested("actorslines.app", "?theme=night", undefined), false);
});

test("non-production hosts: env or query turns night on", () => {
  assert.equal(nightThemeRequested("preview.example.dev", "", "night"), true);
  assert.equal(nightThemeRequested("preview.example.dev", "?theme=night", undefined), true);
  assert.equal(nightThemeRequested("preview.example.dev", "", undefined), false);
});
