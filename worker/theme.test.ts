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

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

test("?theme=night turns night on and persists it for the session", () => {
  const store = memoryStore();
  assert.equal(nightThemeRequested("preview.example.dev", "?theme=night", undefined, store), true);
  assert.equal(store.data.get("al-theme"), "night");
});

test("stored night is used on a later call without the query", () => {
  const store = memoryStore({ "al-theme": "night" });
  assert.equal(nightThemeRequested("preview.example.dev", "", undefined, store), true);
  assert.equal(nightThemeRequested("preview.example.dev", "", undefined, memoryStore()), false);
});

test("?theme=standard clears the stored choice", () => {
  const store = memoryStore({ "al-theme": "night" });
  assert.equal(nightThemeRequested("preview.example.dev", "?theme=standard", undefined, store), false);
  assert.equal(store.data.has("al-theme"), false);
  assert.equal(nightThemeRequested("preview.example.dev", "", undefined, store), false);
});

test("production hosts ignore the query and the store, and never write", () => {
  const store = memoryStore({ "al-theme": "night" });
  assert.equal(nightThemeRequested("actorslines.app", "", undefined, store), false);
  const empty = memoryStore();
  assert.equal(nightThemeRequested("www.actorslines.app", "?theme=night", undefined, empty), false);
  assert.equal(empty.data.size, 0);
});

test("a throwing store falls back safely", () => {
  const boom = () => {
    throw new Error("SecurityError");
  };
  const store = { getItem: boom, setItem: boom, removeItem: boom };
  assert.equal(nightThemeRequested("preview.example.dev", "?theme=night", undefined, store), true);
  assert.equal(nightThemeRequested("preview.example.dev", "?theme=standard", undefined, store), false);
  assert.equal(nightThemeRequested("preview.example.dev", "", undefined, store), false);
});
