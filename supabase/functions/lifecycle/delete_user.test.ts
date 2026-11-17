import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteInactiveUser } from "./delete_user.ts";

test("true when deleteUser reports no error", async () => {
  assert.equal(await deleteInactiveUser({ deleteUser: () => Promise.resolve({ error: null }) }, "u1"), true);
});

test("false when deleteUser returns an error (not thrown)", async () => {
  assert.equal(await deleteInactiveUser({ deleteUser: () => Promise.resolve({ error: { code: "unexpected_failure" } }) }, "u1"), false);
});

test("passes the id through", async () => {
  let seen = "";
  await deleteInactiveUser({ deleteUser: (id) => { seen = id; return Promise.resolve({ error: null }); } }, "abc");
  assert.equal(seen, "abc");
});
