import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_LOAD_ERROR, loadAuthState, withTimeout } from "./authLoad.ts";
import type { AuthLoadDeps } from "./authLoad.ts";

const profileRow = { id: "u1", role: "member" };

function deps(over: Partial<AuthLoadDeps> = {}): AuthLoadDeps {
  return {
    getAal: async () => ({ currentLevel: "aal1", nextLevel: "aal1" }),
    checkTrusted: async () => false,
    fetchProfile: async () => ({ data: profileRow, error: null }),
    ...over,
  };
}

const never = () => new Promise<never>(() => {});

test("no user id is signed out and touches nothing", async () => {
  const r = await loadAuthState(null, deps({ getAal: () => { throw new Error("must not call"); } }));
  assert.deepEqual(r, { status: "signed-out" });
});

test("signed-in user with a profile row is ok", async () => {
  const r = await loadAuthState("u1", deps());
  assert.deepEqual(r, { status: "ok", profile: profileRow });
});

test("2FA pending on an untrusted device is mfa, profile never fetched", async () => {
  let fetched = false;
  const r = await loadAuthState("u1", deps({
    getAal: async () => ({ currentLevel: "aal1", nextLevel: "aal2" }),
    fetchProfile: async () => { fetched = true; return { data: profileRow, error: null }; },
  }));
  assert.deepEqual(r, { status: "mfa" });
  assert.equal(fetched, false);
});

test("2FA pending but trusted device proceeds to profile", async () => {
  const r = await loadAuthState("u1", deps({
    getAal: async () => ({ currentLevel: "aal1", nextLevel: "aal2" }),
    checkTrusted: async () => true,
  }));
  assert.equal(r.status, "ok");
});

test("missing profile row is an error, not an endless load", async () => {
  const r = await loadAuthState("u1", deps({ fetchProfile: async () => ({ data: null, error: { message: "0 rows" } }) }));
  assert.deepEqual(r, { status: "error", message: AUTH_LOAD_ERROR });
});

test("a throwing step is an error, not an unhandled rejection", async () => {
  const r = await loadAuthState("u1", deps({ checkTrusted: async () => { throw new Error("network"); }, getAal: async () => ({ currentLevel: "aal1", nextLevel: "aal2" }) }));
  assert.deepEqual(r, { status: "error", message: AUTH_LOAD_ERROR });
});

test("a hung step times out into an error", async () => {
  const r = await loadAuthState("u1", deps({ fetchProfile: never }), 30);
  assert.deepEqual(r, { status: "error", message: AUTH_LOAD_ERROR });
});

test("withTimeout passes through a fast result and rejects a slow one", async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 50, "x"), 7);
  await assert.rejects(withTimeout(never(), 20, "slow"), /slow timed out/);
});
