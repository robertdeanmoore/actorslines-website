import assert from "node:assert/strict";
import test from "node:test";
import {
  describeOutcome,
  type BetaAction,
  type BetaDecideOk,
  type BetaDecideResult,
} from "./betaOutcome.ts";

const ACTIONS: BetaAction[] = ["accept", "reject", "resend_invite", "group_added", "withdraw", "reopen"];

function ok(over: Partial<BetaDecideOk> = {}): BetaDecideOk {
  return {
    ok: true,
    status: "approved",
    emailSent: true,
    already: false,
    grantApplied: true,
    licenceRevoked: true,
    ...over,
  };
}

test("already-done short-circuits every action", () => {
  for (const action of ACTIONS) {
    assert.deepEqual(describeOutcome(action, ok({ already: true })), {
      tone: "success",
      message: "Nothing changed: it was already done.",
    });
  }
});

test("accept succeeds when the email is sent", () => {
  assert.deepEqual(describeOutcome("accept", ok()), {
    tone: "success",
    message: "Accepted. The invitation email has been sent.",
  });
});

test("accept with an unknown email outcome counts as success", () => {
  assert.deepEqual(describeOutcome("accept", ok({ emailSent: null })), {
    tone: "success",
    message: "Accepted. The invitation email has been sent.",
  });
});

test("accept warns when the email could not be sent", () => {
  assert.deepEqual(describeOutcome("accept", ok({ emailSent: false })), {
    tone: "warning",
    message: "Accepted, but the email could not be sent. Use Resend invite.",
  });
});

test("accept warns when the licence could not be added", () => {
  assert.deepEqual(describeOutcome("accept", ok({ grantApplied: false })), {
    tone: "warning",
    message: "Accepted, but the licence could not be added yet. Grant it by hand on the licences page.",
  });
});

test("accept prefers the licence warning when both email and licence failed", () => {
  assert.deepEqual(describeOutcome("accept", ok({ emailSent: false, grantApplied: false })), {
    tone: "warning",
    message: "Accepted, but the licence could not be added yet. Grant it by hand on the licences page.",
  });
});

test("reject succeeds when the email is sent", () => {
  assert.deepEqual(describeOutcome("reject", ok({ emailSent: true, grantApplied: null })), {
    tone: "success",
    message: "Rejected. The email has been sent.",
  });
});

test("reject warns when the email could not be sent", () => {
  assert.deepEqual(describeOutcome("reject", ok({ emailSent: false, grantApplied: null })), {
    tone: "warning",
    message: "Rejected, but the email could not be sent. Write to the applicant yourself.",
  });
});

test("resend_invite reports the fresh link", () => {
  assert.deepEqual(describeOutcome("resend_invite", ok({ grantApplied: null, licenceRevoked: null })), {
    tone: "success",
    message: "A fresh invitation has been sent. The old link no longer works.",
  });
});

test("group_added reports the Play link email", () => {
  assert.deepEqual(describeOutcome("group_added", ok({ emailSent: true, grantApplied: null, licenceRevoked: null })), {
    tone: "success",
    message: "Saved. The applicant has been emailed the Google Play link.",
  });
});

test("withdraw succeeds when the licence was revoked", () => {
  assert.deepEqual(describeOutcome("withdraw", ok({ emailSent: null, grantApplied: true })), {
    tone: "success",
    message: "Withdrawn. The place is free again.",
  });
});

test("withdraw succeeds when no licence was involved", () => {
  assert.deepEqual(describeOutcome("withdraw", ok({ emailSent: null, grantApplied: null, licenceRevoked: null })), {
    tone: "success",
    message: "Withdrawn. The place is free again.",
  });
});

test("withdraw warns when the licence could not be revoked", () => {
  assert.deepEqual(describeOutcome("withdraw", ok({ emailSent: null, licenceRevoked: false })), {
    tone: "warning",
    message: "Withdrawn, but the licence could not be revoked. Revoke it on the licences page.",
  });
});

test("reopen moves back to pending", () => {
  assert.deepEqual(describeOutcome("reopen", ok({ emailSent: null, grantApplied: null, licenceRevoked: null })), {
    tone: "success",
    message: "Moved back to pending.",
  });
});
