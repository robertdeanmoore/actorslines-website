import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_LOAD_ERROR, createLoadCoordinator, loadAuthState, requireAal, withTimeout } from "./authLoad.ts";
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

test("requireAal returns data and throws on error or null data (fail closed)", () => {
  const data = { currentLevel: "aal1", nextLevel: "aal2" };
  assert.deepEqual(requireAal({ data, error: null }), data);
  assert.throws(() => requireAal({ data: null, error: { message: "boom" } }));
  assert.throws(() => requireAal({ data: null, error: null }));
  assert.throws(() => requireAal({ data, error: { message: "boom" } }));
});

test("2FA-enrolled aal1 session with an errored AAL answer is error, never ok", async () => {
  let fetched = false;
  const r = await loadAuthState("u1", deps({
    getAal: async () => requireAal({ data: null, error: { message: "boom" } }),
    fetchProfile: async () => { fetched = true; return { data: profileRow, error: null }; },
  }));
  assert.deepEqual(r, { status: "error", message: AUTH_LOAD_ERROR });
  assert.equal(fetched, false);
});

test("coordinator shares an in-flight load for the same key (one request)", async () => {
  const c = createLoadCoordinator();
  let calls = 0;
  const work = async () => { calls++; await new Promise((r) => setTimeout(r, 10)); };
  await Promise.all([c.run("u1:t", work), c.run("u1:t", work)]);
  assert.equal(calls, 1);
  await c.run("u1:t", work); // settled: a later call loads again
  assert.equal(calls, 2);
});

test("coordinator force bypasses sharing", async () => {
  const c = createLoadCoordinator();
  let calls = 0;
  const work = async () => { calls++; await new Promise((r) => setTimeout(r, 10)); };
  await Promise.all([c.run("k", work), c.run("k", work, true)]);
  assert.equal(calls, 2);
});

test("coordinator: an older load for session A is stale once B starts and cannot write", async () => {
  const c = createLoadCoordinator();
  const writes: string[] = [];
  let releaseA!: () => void;
  const a = c.run("A", async (isCurrent) => {
    await new Promise<void>((r) => { releaseA = r; });
    if (isCurrent()) writes.push("A");
  });
  const b = c.run("B", async (isCurrent) => { if (isCurrent()) writes.push("B"); });
  await b;
  releaseA();
  await a;
  assert.deepEqual(writes, ["B"]);
});

test("coordinator generation moves only when a new load starts", async () => {
  const c = createLoadCoordinator();
  const g0 = c.generation();
  const p = c.run("k", async () => {});
  const q = c.run("k", async () => {});
  await Promise.all([p, q]);
  assert.equal(c.generation(), g0 + 1);
});
