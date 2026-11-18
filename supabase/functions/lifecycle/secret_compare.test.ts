import { test } from "node:test";
import assert from "node:assert/strict";
import { secretMatches } from "./secret_compare.ts";

test("equal strings match", async () => {
  assert.equal(await secretMatches("s3cret-value", "s3cret-value"), true);
});

test("differ by one character: no match", async () => {
  assert.equal(await secretMatches("s3cret-valuf", "s3cret-value"), false);
});

test("different length: no match (prefix too)", async () => {
  assert.equal(await secretMatches("s3cret", "s3cret-value"), false);
  assert.equal(await secretMatches("s3cret-value-and-more", "s3cret-value"), false);
});

test("empty, null, undefined provided: no match", async () => {
  assert.equal(await secretMatches("", "s3cret-value"), false);
  assert.equal(await secretMatches(null, "s3cret-value"), false);
  assert.equal(await secretMatches(undefined, "s3cret-value"), false);
});

test("missing or empty expected fails closed, even when provided is empty or the string 'undefined'", async () => {
  assert.equal(await secretMatches("", ""), false);
  assert.equal(await secretMatches("x", ""), false);
  assert.equal(await secretMatches("x", undefined), false);
  assert.equal(await secretMatches("x", null), false);
  assert.equal(await secretMatches("undefined", undefined), false);
});

test("non-ASCII secrets compare correctly", async () => {
  assert.equal(await secretMatches("pässwörd-✓", "pässwörd-✓"), true);
  assert.equal(await secretMatches("pässwörd-✓", "pässwörd-✗"), false);
});
