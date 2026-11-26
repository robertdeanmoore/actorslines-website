import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptanceEmail, acceptanceExistingAccountEmail, groupAddedEmail, rejectionEmail, reportParagraph, SIGN_OFF,
} from "./beta_text.ts";

const acceptance = {
  name: "Ada Lovelace", googleEmail: "ada.g@gmail.com", accountEmail: "ada@example.com",
  inviteLink: "https://actorslines.app/invite/abc123", expiryDate: "10 December 2026",
};
const existing = { name: "Ada Lovelace", googleEmail: "ada.g@gmail.com", accountEmail: "ada@example.com" };
const groupAdded = { name: "Ada Lovelace", googleEmail: "ada.g@gmail.com", optInLink: "https://play.google.com/apps/testing/example" };

test("acceptance email: subject, greeting, sign-off, no trial", () => {
  const m = acceptanceEmail(acceptance);
  assert.equal(m.subject, "You're in: Actors Lines beta testing");
  assert.match(m.text, /^Hello Ada,/);
  assert.ok(m.text.endsWith(`${SIGN_OFF}\n`));
  assert.doesNotMatch(m.text + m.subject, /trial/i);
});
test("acceptance existing account email: subject, greeting, sign-off, no trial", () => {
  const m = acceptanceExistingAccountEmail(existing);
  assert.equal(m.subject, "You're in: Actors Lines beta testing");
  assert.match(m.text, /^Hello Ada,/);
  assert.ok(m.text.endsWith(`${SIGN_OFF}\n`));
  assert.doesNotMatch(m.text + m.subject, /trial/i);
});
test("rejection email: subject, greeting, sign-off, no trial", () => {
  const m = rejectionEmail({ name: "Ada Lovelace" });
  assert.equal(m.subject, "Your Actors Lines beta application");
  assert.match(m.text, /^Hello Ada,/);
  assert.ok(m.text.endsWith(`${SIGN_OFF}\n`));
  assert.doesNotMatch(m.text + m.subject, /trial/i);
});
test("group added email: subject, greeting, sign-off, no trial", () => {
  const m = groupAddedEmail(groupAdded);
  assert.equal(m.subject, "You can now join the Actors Lines beta on Google Play");
  assert.match(m.text, /^Hello Ada,/);
  assert.ok(m.text.endsWith(`${SIGN_OFF}\n`));
  assert.doesNotMatch(m.text + m.subject, /trial/i);
});
test("a name that is not name-like greets 'there'", () => {
  const m = rejectionEmail({ name: "http://spam.example Bob" });
  assert.match(m.text, /^Hello there,/);
});
test("acceptance email contains all substitutions and steps, no play store link", () => {
  const { text } = acceptanceEmail(acceptance);
  assert.ok(text.includes(acceptance.inviteLink));
  assert.ok(text.includes(acceptance.expiryDate));
  assert.ok(text.includes(acceptance.googleEmail));
  assert.ok(text.includes(acceptance.accountEmail));
  assert.ok(text.includes("Step 1"));
  assert.ok(text.includes("Step 2"));
  assert.ok(text.includes("Step 3"));
  assert.ok(!text.includes("play.google.com"));
});
test("existing-account email drops account creation and the invite link", () => {
  const { text } = acceptanceExistingAccountEmail(existing);
  assert.ok(!text.includes("Step 1: Create"));
  assert.ok(!text.includes("Step 3"));
  assert.ok(!text.includes(acceptance.inviteLink));
  assert.ok(text.includes("already have an Actors Lines account"));
});
test("rejection email contains no email address", () => {
  const { text } = rejectionEmail({ name: "Ada Lovelace" });
  assert.ok(!text.includes("@"));
});
test("group added email repeats the google email and includes the opt-in link", () => {
  const { text } = groupAddedEmail(groupAdded);
  assert.ok(text.includes(groupAdded.optInLink));
  const count = text.split(groupAdded.googleEmail).length - 1;
  assert.equal(count, 2);
});
test("report paragraph varies with the in-app form flag", () => {
  assert.ok(reportParagraph(false).includes("actorslines.app"));
  assert.ok(!reportParagraph(false).includes("Diagnostics"));
  assert.ok(reportParagraph(true).includes("Diagnostics"));
});
test("no subject contains a newline", () => {
  const subjects = [
    acceptanceEmail(acceptance).subject,
    acceptanceExistingAccountEmail(existing).subject,
    rejectionEmail({ name: "Ada Lovelace" }).subject,
    groupAddedEmail(groupAdded).subject,
  ];
  for (const s of subjects) assert.ok(!s.includes("\n"));
});
