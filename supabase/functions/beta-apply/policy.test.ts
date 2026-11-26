import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicantReply, BETA_CAP, firstName, notifyEmail, oneLine, REAPPLY_AFTER_DAYS, validateApplication,
  withinReapplyWindow,
} from "./policy.ts";

const good = {
  name: "Ada Lovelace", reason: "I rehearse every week and want to help shape the app.",
  email: "Ada@Example.com", same_google_email: true, town: "Leigh-on-Sea",
  actor_type: "amateur", in_company: false, consent: true,
};

test("valid application is cleaned and lower-cased", () => {
  const v = validateApplication(good);
  assert.ok(v.ok);
  if (v.ok) {
    assert.equal(v.clean.email, "ada@example.com");
    assert.equal(v.clean.google_email, "ada@example.com");
    assert.equal(v.clean.company_name, null);
  }
});
test("separate google email is used when not 'same'", () => {
  const v = validateApplication({ ...good, same_google_email: false, google_email: "Ada.G@gmail.com" });
  assert.ok(v.ok);
  if (v.ok) assert.equal(v.clean.google_email, "ada.g@gmail.com");
});
test("each missing or malformed field is refused", () => {
  const bad: Record<string, unknown>[] = [
    { ...good, name: "  " },
    { ...good, email: "foo@" },
    { ...good, reason: "too short" },
    { ...good, reason: "x".repeat(1001) },
    { ...good, town: "" },
    { ...good, same_google_email: false, google_email: "nope" },
    { ...good, actor_type: "other" },
    { ...good, in_company: undefined },
    { ...good, in_company: true, company_name: "" },
    { ...good, consent: false },
    { ...good, consent: "true" },
  ];
  for (const b of bad) assert.equal(validateApplication(b).ok, false, JSON.stringify(b));
});
test("company name required when in_company, dropped when not", () => {
  const yes = validateApplication({ ...good, in_company: true, company_name: " Players Ltd " });
  assert.ok(yes.ok);
  if (yes.ok) assert.equal(yes.clean.company_name, "Players Ltd");
  const no = validateApplication({ ...good, in_company: false, company_name: "Ignored" });
  assert.ok(no.ok);
  if (no.ok) assert.equal(no.clean.company_name, null);
});
test("reapply window is 90 days from the decision", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  const day = 24 * 60 * 60 * 1000;
  assert.equal(withinReapplyWindow(new Date(now.getTime() - (REAPPLY_AFTER_DAYS - 1) * day).toISOString(), now), true);
  assert.equal(withinReapplyWindow(new Date(now.getTime() - (REAPPLY_AFTER_DAYS + 1) * day).toISOString(), now), false);
  assert.equal(withinReapplyWindow(null, now), true);
});
test("subject and first name are single-line", () => {
  assert.equal(oneLine("a\r\nBcc: x"), "a Bcc: x");
  assert.equal(firstName("  Ada  Lovelace"), "Ada");
  assert.equal(firstName(""), "there");
});
test("firstName greets by name only for name-like tokens", () => {
  assert.equal(firstName("Ada Lovelace"), "Ada");
  assert.equal(firstName("Mary-Jane Watson"), "Mary-Jane");
  assert.equal(firstName("Zoë Ångström"), "Zoë");
  assert.equal(firstName("O'Brien Smith"), "O'Brien");
  assert.equal(firstName("O’Neil"), "O’Neil");
  assert.equal(firstName("http://spam.example/win Ada"), "there");
  assert.equal(firstName("www.spam.example"), "there");
  assert.equal(firstName("Ada123"), "there");
  assert.equal(firstName("A".repeat(41)), "there");
  assert.equal(firstName("   "), "there");
});
test("notify email shows places used and the admin link", () => {
  const v = validateApplication(good);
  assert.ok(v.ok);
  if (!v.ok) return;
  const m = notifyEmail(v.clean, 7, 12);
  assert.match(m.text, new RegExp(`Places used: 12 of ${BETA_CAP} \\(${BETA_CAP - 12} left\\)`));
  assert.match(m.text, /https:\/\/actorslines\.app\/admin\/beta\/7/);
  assert.match(m.subject, /^New beta application: Ada Lovelace, Leigh-on-Sea$/);
});
test("applicant reply says beta, never trial, and gives the shared inbox", () => {
  const m = applicantReply("Ada Lovelace");
  assert.match(m.text, /^Hello Ada,/);
  assert.match(m.text, /hello@actorslines\.app/);
  assert.doesNotMatch(m.text + m.subject, /trial/i);
});
