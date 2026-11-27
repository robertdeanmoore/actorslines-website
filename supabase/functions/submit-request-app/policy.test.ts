import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_MAX_BYTES, IMAGE_MAX_BYTES, checkUploadedFile, duplicateSinceIso, extensionFor, isDuplicateWithin,
  kindLabel, mayReport, parseKind, sniffMime, storagePathFor, submitBuckets, toRequestRow, validateSubmit,
} from "./policy.ts";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const base = { subject: "Crash on import", description: "The app closed when I imported a script." };
const bytes = (...b: number[]) => new Uint8Array(b);
const pngHead = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);

test("kind: absent or null defaults to support, valid values pass, anything else is refused", () => {
  assert.equal(parseKind(undefined), "support");
  assert.equal(parseKind(null), "support");
  assert.equal(parseKind("enhancement"), "enhancement");
  assert.equal(parseKind("bogus"), null);
  assert.equal(parseKind(5), null);
  const r = validateSubmit({ ...base, kind: "bogus" });
  assert.equal(r.ok, false);
});

test("subject and description length limits are 3-120 and 10-4000 (AC4.3 boundaries)", () => {
  assert.equal(validateSubmit({ ...base, subject: "ab" }).ok, false);
  assert.equal(validateSubmit({ ...base, subject: "abc" }).ok, true);
  assert.equal(validateSubmit({ ...base, subject: "a".repeat(120) }).ok, true);
  assert.equal(validateSubmit({ ...base, subject: "a".repeat(121) }).ok, false);
  assert.equal(validateSubmit({ ...base, description: "123456789" }).ok, false);
  assert.equal(validateSubmit({ ...base, description: "1234567890" }).ok, true);
  assert.equal(validateSubmit({ ...base, description: "d".repeat(4000) }).ok, true);
  assert.equal(validateSubmit({ ...base, description: "d".repeat(4001) }).ok, false);
  assert.equal(validateSubmit({ subject: "   ", description: base.description }).ok, false);
});

test("non-object or empty bodies are refused without throwing", () => {
  for (const b of [null, undefined, "x", 5, []]) assert.equal(validateSubmit(b).ok, false);
});

test("a valid submit keeps trimmed text, defaults kind to support and carries device fields", () => {
  const r = validateSubmit({ ...base, subject: "  Crash on import  ", app_version: " 4.9.0 ", device_model: "Pixel 7", android_sdk: 34 });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.subject, "Crash on import");
  assert.equal(r.value.kind, "support");
  assert.equal(r.value.appVersion, "4.9.0");
  assert.equal(r.value.deviceModel, "Pixel 7");
  assert.equal(r.value.androidSdk, 34);
  assert.deepEqual(r.value.attachments, []);
});

test("device fields: blank becomes null, long values are cut, bad android_sdk is refused", () => {
  const r = validateSubmit({ ...base, app_version: "   ", device_model: "m".repeat(200) });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.appVersion, null);
    assert.equal(r.value.deviceModel?.length, 80);
  }
  for (const sdk of [0, 100, 1.5, "34", NaN]) assert.equal(validateSubmit({ ...base, android_sdk: sdk }).ok, false);
});

test("attachments: one image and one audio of an allowed type and size are accepted", () => {
  const r = validateSubmit({ ...base, attachments: [
    { kind: "image", mime: "image/png", size: 1000 }, { kind: "audio", mime: "audio/mp4", size: 2000 },
  ] });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.attachments.length, 2);
});

test("attachments: wrong type, mismatched kind, zero size, executable and a third file are refused", () => {
  const bad = [
    [{ kind: "image", mime: "application/x-msdownload", size: 10 }],
    [{ kind: "audio", mime: "image/png", size: 10 }],
    [{ kind: "image", mime: "image/png", size: 0 }],
    [{ kind: "image", mime: "image/png", size: 1.5 }],
    [{ kind: "image", mime: "image/png", size: 10 }, { kind: "image", mime: "image/jpeg", size: 10 }],
    [{ kind: "image", mime: "image/png", size: 10 }, { kind: "audio", mime: "audio/ogg", size: 10 }, { kind: "audio", mime: "audio/aac", size: 10 }],
    "not-an-array",
    [null],
  ];
  for (const attachments of bad) assert.equal(validateSubmit({ ...base, attachments }).ok, false, JSON.stringify(attachments));
});

test("attachments: size caps are 5 MB for images and 3 MB for audio, to the byte", () => {
  assert.equal(validateSubmit({ ...base, attachments: [{ kind: "image", mime: "image/webp", size: IMAGE_MAX_BYTES }] }).ok, true);
  assert.equal(validateSubmit({ ...base, attachments: [{ kind: "image", mime: "image/webp", size: IMAGE_MAX_BYTES + 1 }] }).ok, false);
  assert.equal(validateSubmit({ ...base, attachments: [{ kind: "audio", mime: "audio/mpeg", size: AUDIO_MAX_BYTES }] }).ok, true);
  assert.equal(validateSubmit({ ...base, attachments: [{ kind: "audio", mime: "audio/mpeg", size: AUDIO_MAX_BYTES + 1 }] }).ok, false);
});

test("row mapping: subject and description fill the required columns and mark the row as an app report", () => {
  const v = validateSubmit({ ...base, attachments: [{ kind: "image", mime: "image/png", size: 10 }], android_sdk: 33 });
  assert.equal(v.ok, true);
  if (!v.ok) return;
  const row = toRequestRow("user-1", v.value);
  assert.equal(row.author_id, "user-1");
  assert.equal(row.source, "app");
  assert.equal(row.title, base.subject);
  assert.equal(row.goal, base.description);
  assert.ok(row.where_in_app.length >= 10);       // 0001 CHECK
  assert.ok(row.how_it_works.length >= 30);       // 0001 CHECK
  assert.equal(row.attachments_complete, false);  // declared files not confirmed yet
  assert.equal(row.android_sdk, 33);
  const none = validateSubmit(base);
  assert.equal(none.ok && toRequestRow("u", none.value).attachments_complete, true);
});

test("expired or withdrawn licence does not stop a report: only a signed-in account matters (D3)", () => {
  assert.equal(mayReport({ id: "user-1" }), true);
  assert.equal(mayReport(null), false);
  assert.equal(mayReport(undefined), false);
  assert.equal(mayReport({ id: "" }), false);
  assert.equal(mayReport({}), false);
});

test("rate-limit buckets are per user and separate from the website form's buckets", () => {
  const a = submitBuckets("u1");
  assert.notEqual(a.hour, a.day);
  assert.notEqual(a.hour, submitBuckets("u2").hour);
  assert.ok(!a.hour.startsWith("submit-h:") && !a.day.startsWith("submit-d:"));
});

test("duplicate window: inside 2 minutes is a double tap, 2 minutes and later is not", () => {
  const now = Date.parse("2026-11-27T12:00:00.000Z");
  assert.equal(isDuplicateWithin("2026-11-27T11:58:01.000Z", now), true);
  assert.equal(isDuplicateWithin("2026-11-27T11:58:00.000Z", now), false);
  assert.equal(isDuplicateWithin("2026-11-27T12:00:05.000Z", now), false);   // a future timestamp is not a duplicate
  assert.equal(isDuplicateWithin("garbage", now), false);
  assert.equal(duplicateSinceIso(now), "2026-11-27T11:58:00.000Z");
});

test("storage path matches the table's CHECK pattern and rejects bad input", () => {
  const pattern = /^request\/[0-9]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|m4a|aac|ogg|mp3)$/;
  for (const mime of ["image/jpeg", "image/png", "image/webp", "audio/mp4", "audio/aac", "audio/ogg", "audio/mpeg"]) {
    const p = storagePathFor(42, UUID, mime);
    assert.ok(p && pattern.test(p), mime);
  }
  assert.equal(storagePathFor(42, UUID, "image/gif"), null);
  assert.equal(storagePathFor(0, UUID, "image/png"), null);
  assert.equal(storagePathFor(42, "../../etc/passwd", "image/png"), null);
  assert.equal(extensionFor("audio/mp4"), "m4a");
});

test("magic bytes: each allowed type is recognised and others are not", () => {
  assert.deepEqual(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0)), ["image/jpeg"]);
  assert.deepEqual(sniffMime(pngHead), ["image/png"]);
  assert.deepEqual(sniffMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)), ["image/webp"]);
  assert.deepEqual(sniffMime(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20)), ["audio/mp4"]);
  assert.deepEqual(sniffMime(bytes(0x4f, 0x67, 0x67, 0x53, 0)), ["audio/ogg"]);
  assert.deepEqual(sniffMime(bytes(0x49, 0x44, 0x33, 4, 0)), ["audio/mpeg"]);
  assert.deepEqual(sniffMime(bytes(0xff, 0xf1, 0x50, 0x80)), ["audio/aac"]);
  assert.deepEqual(sniffMime(bytes(0xff, 0xfb, 0x90, 0x00)), ["audio/mpeg"]);
  assert.deepEqual(sniffMime(bytes(0x4d, 0x5a, 0x90, 0x00)), []);     // "MZ": a Windows executable
  assert.deepEqual(sniffMime(bytes()), []);
});

test("AC4.7: a file whose content does not match its declared type is refused", () => {
  const exe = bytes(0x4d, 0x5a, 0x90, 0x00, 0x03, 0, 0, 0);
  assert.deepEqual(checkUploadedFile({ kind: "image", mime: "image/png", size: 8 }, exe, 8), { ok: false, reason: "type_mismatch" });
  assert.deepEqual(checkUploadedFile({ kind: "image", mime: "image/jpeg", size: 12 }, pngHead, 12), { ok: false, reason: "type_mismatch" });
  assert.deepEqual(checkUploadedFile({ kind: "image", mime: "image/png", size: 12 }, pngHead, 12), { ok: true });
});

test("an uploaded file is judged by its real size, not the declared one", () => {
  assert.deepEqual(checkUploadedFile({ kind: "image", mime: "image/png", size: 10 }, pngHead, IMAGE_MAX_BYTES + 1), { ok: false, reason: "too_large" });
  assert.deepEqual(checkUploadedFile({ kind: "audio", mime: "audio/ogg", size: 10 }, bytes(0x4f, 0x67, 0x67, 0x53), AUDIO_MAX_BYTES + 1), { ok: false, reason: "too_large" });
  assert.deepEqual(checkUploadedFile({ kind: "image", mime: "image/png", size: 10 }, new Uint8Array(0), 0), { ok: false, reason: "empty" });
});

test("labels", () => {
  assert.equal(kindLabel("support"), "Support");
  assert.equal(kindLabel("enhancement"), "Enhancement");
});
