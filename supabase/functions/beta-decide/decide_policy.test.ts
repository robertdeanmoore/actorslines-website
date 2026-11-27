import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptOutcome, acceptStep, ACTIONS, classifyAccount, formatExpiry, inviteLink, MAX_INTERNAL_NOTE, parseRequest,
  UNCONFIRMED_ACCOUNT_MESSAGE,
} from "./decide_policy.ts";
import { BETA_CAP, REPLY_TO, SITE_URL } from "../beta-apply/policy.ts";
import * as local from "./constants.ts";

test("local constants match beta-apply policy", () => {
  assert.deepEqual(
    { BETA_CAP: local.BETA_CAP, REPLY_TO: local.REPLY_TO, SITE_URL: local.SITE_URL },
    { BETA_CAP, REPLY_TO, SITE_URL },
  );
});

test("parseRequest accepts every known action with a positive integer id", () => {
  for (const action of ACTIONS) {
    const r = parseRequest({ action, id: 7 });
    assert.ok(r.ok, action);
    if (r.ok) {
      assert.equal(r.action, action);
      assert.equal(r.id, 7);
      assert.equal(r.note, null);
    }
  }
});

test("parseRequest refuses a tampered body", () => {
  const bad: unknown[] = [
    null, "accept", [], 5,
    { action: "approve", id: 1 },
    { action: "accept" },
    { action: "accept", id: "1" },
    { action: "accept", id: 0 },
    { action: "accept", id: -3 },
    { action: "accept", id: 1.5 },
    { action: "accept", id: Number.MAX_SAFE_INTEGER + 2 },
    { action: "reject", id: 1, internal_note: 42 },
    { action: "reject", id: 1, internal_note: "x".repeat(MAX_INTERNAL_NOTE + 1) },
  ];
  for (const b of bad) assert.equal(parseRequest(b).ok, false, JSON.stringify(b));
});

test("parseRequest trims the internal note and drops an empty one", () => {
  const withNote = parseRequest({ action: "reject", id: 2, internal_note: "  not a fit  " });
  assert.ok(withNote.ok);
  if (withNote.ok) assert.equal(withNote.note, "not a fit");
  const empty = parseRequest({ action: "reject", id: 2, internal_note: "   " });
  assert.ok(empty.ok);
  if (empty.ok) assert.equal(empty.note, null);
});

test("accept outcomes: only a fresh approval proceeds to send email", () => {
  assert.deepEqual(acceptOutcome("approved"), { status: 200, proceed: true });
  assert.deepEqual(acceptOutcome("already"), { status: 200, proceed: false, already: true });
  const full = acceptOutcome("cap_full");
  assert.equal(full.status, 409);
  assert.equal(full.proceed, false);
  assert.match(full.error ?? "", new RegExp(`${BETA_CAP}`));
  assert.equal(acceptOutcome("not_pending").status, 409);
  assert.equal(acceptOutcome("not_found").status, 404);
  assert.equal(acceptOutcome(null).proceed, false);
  assert.equal(acceptOutcome("anything else").status, 500);
});

test("invite link and expiry text", () => {
  assert.equal(inviteLink("abc"), "https://actorslines.app/invite/abc");
  assert.equal(formatExpiry("2026-12-10T23:30:00Z"), "10 December 2026");
});

test("accept outcome: a non-admin decider is forbidden", () => {
  const f = acceptOutcome("forbidden");
  assert.equal(f.status, 403);
  assert.equal(f.proceed, false);
});

test("classifyAccount: a profile with an unconfirmed auth user is unconfirmed, never confirmed", () => {
  assert.equal(classifyAccount(false, null), "none");
  assert.equal(classifyAccount(false, "2026-01-01T00:00:00Z"), "none");
  assert.equal(classifyAccount(true, null), "unconfirmed");
  assert.equal(classifyAccount(true, undefined), "unconfirmed");
  assert.equal(classifyAccount(true, "2026-01-01T00:00:00Z"), "confirmed");
});

test("acceptStep: unconfirmed squatter blocks fresh accept and replay; no grant, no invite", () => {
  const open = { grant_applied_at: null, user_id: null, invite_sent_at: null };
  assert.equal(acceptStep(false, "unconfirmed", open), "blocked");
  assert.equal(acceptStep(true, "unconfirmed", open), "blocked");
});

test("acceptStep: fresh accept grants a confirmed account or invites when none", () => {
  const open = { grant_applied_at: null, user_id: null, invite_sent_at: null };
  assert.equal(acceptStep(false, "confirmed", open), "grant");
  assert.equal(acceptStep(false, "none", open), "invite");
});

test("acceptStep: replay retries a failed grant, and a never-sent invite, but nothing else", () => {
  const open = { grant_applied_at: null, user_id: null, invite_sent_at: null };
  assert.equal(acceptStep(true, "confirmed", open), "grant");
  assert.equal(acceptStep(true, "none", open), "invite");
  assert.equal(acceptStep(true, "none", { ...open, invite_sent_at: "2026-01-01T00:00:00Z" }), "done");
  assert.equal(acceptStep(true, "confirmed", { ...open, grant_applied_at: "2026-01-01T00:00:00Z" }), "done");
  assert.equal(acceptStep(true, "confirmed", { ...open, user_id: "u1" }), "done");
});

test("UNCONFIRMED_ACCOUNT_MESSAGE names the fix", () => {
  assert.match(UNCONFIRMED_ACCOUNT_MESSAGE, /Supabase Auth/);
  assert.match(UNCONFIRMED_ACCOUNT_MESSAGE, /replay Accept or Resend invite/);
});
