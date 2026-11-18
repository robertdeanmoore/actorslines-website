import { test } from "node:test";
import assert from "node:assert/strict";
import { licenceDisplayName } from "./licence_text.ts";

test("known products get a plain-English name", () => {
  assert.equal(licenceDisplayName("trial_30d"), "30-day trial");
  assert.equal(licenceDisplayName("single_play_6mo"), "Single Play licence");
  assert.equal(licenceDisplayName("unlimited_6mo"), "Unlimited licence");
});

test("unknown, empty or missing codes never leak a raw code", () => {
  for (const c of ["admin_full", "group_x", "", null, undefined]) {
    const n = licenceDisplayName(c as string | null | undefined);
    assert.equal(n, "licence");
    assert.doesNotMatch(n, /_/);
  }
});

test("no mapped name contains an underscore", () => {
  for (const c of ["trial_30d", "single_play_6mo", "unlimited_6mo", "group_member", "comp_rolling"]) {
    assert.doesNotMatch(licenceDisplayName(c), /_/);
  }
});
