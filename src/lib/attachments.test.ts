import assert from "node:assert/strict";
import test from "node:test";
import {
  attachmentState,
  deviceSummary,
  formatBytes,
  summariseAttachments,
  type AttachmentRow,
} from "./attachments.ts";

function row(over: Partial<AttachmentRow> = {}): AttachmentRow {
  return {
    id: 1,
    request_id: 100,
    kind: "image",
    declared_mime: "image/png",
    declared_size: 2048,
    storage_path: "100/shot.png",
    status: "confirmed",
    created_at: "2026-11-27T00:00:00Z",
    confirmed_at: "2026-11-27T00:00:01Z",
    ...over,
  };
}

test("formatBytes boundaries", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5242880), "5.0 MB");
  assert.equal(formatBytes(-1), "unknown");
  assert.equal(formatBytes(NaN), "unknown");
  assert.equal(formatBytes(Infinity), "unknown");
});

test("attachmentState maps each status", () => {
  assert.equal(attachmentState(row({ status: "confirmed" })), "viewable");
  assert.equal(attachmentState(row({ status: "pending" })), "incomplete");
  assert.equal(attachmentState(row({ status: "rejected" })), "rejected");
});

test("summariseAttachments: empty with complete -> no attachments and no flag", () => {
  const s = summariseAttachments([], true);
  assert.equal(s.headline, "No attachments");
  assert.equal(s.incompleteFlag, false);
  assert.deepEqual(s.items, []);
});

test("summariseAttachments: empty with attachmentsComplete false -> flag", () => {
  const s = summariseAttachments([], false);
  assert.equal(s.headline, "Attachment upload incomplete");
  assert.equal(s.incompleteFlag, true);
});

test("summariseAttachments: one confirmed image -> 1 attachment", () => {
  const s = summariseAttachments([row()], true);
  assert.equal(s.headline, "1 attachment");
  assert.equal(s.incompleteFlag, false);
  assert.equal(s.items[0].label, "Screenshot");
  assert.equal(s.items[0].sizeLabel, "2.0 KB");
});

test("summariseAttachments: image and audio -> 2 attachments, image first even when audio listed first", () => {
  const s = summariseAttachments([
    row({ id: 2, kind: "audio", declared_mime: "audio/ogg", declared_size: 3145728 }),
    row({ id: 1, declared_size: 1024 }),
  ], true);
  assert.equal(s.headline, "2 attachments");
  assert.deepEqual(s.items.map((i) => i.id), [1, 2]);
  assert.deepEqual(s.items.map((i) => i.kind), ["image", "audio"]);
  assert.equal(s.items[1].label, "Audio recording");
  assert.equal(s.items[1].sizeLabel, "3.0 MB");
});

test("summariseAttachments: pending row sets the flag even when attachmentsComplete is true", () => {
  const s = summariseAttachments([row({ status: "pending" })], true);
  assert.equal(s.incompleteFlag, true);
  assert.equal(s.headline, "Attachment upload incomplete");
  assert.equal(s.items[0].state, "incomplete");
});

test("summariseAttachments: a rejected row alone does not set the flag", () => {
  const s = summariseAttachments([row({ status: "rejected" })], true);
  assert.equal(s.incompleteFlag, false);
  assert.equal(s.headline, "1 attachment");
  assert.equal(s.items[0].state, "rejected");
});

test("summariseAttachments: null and undefined attachmentsComplete with no rows -> no flag", () => {
  assert.equal(summariseAttachments([], null).incompleteFlag, false);
  assert.equal(summariseAttachments([], undefined).incompleteFlag, false);
  assert.equal(summariseAttachments([], null).headline, "No attachments");
});

test("summariseAttachments: labels and size labels", () => {
  const s = summariseAttachments([
    row({ id: 1, kind: "image", declared_size: 0 }),
    row({ id: 2, kind: "audio", declared_size: -5 }),
  ], true);
  assert.equal(s.items[0].label, "Screenshot");
  assert.equal(s.items[0].sizeLabel, "0 B");
  assert.equal(s.items[1].label, "Audio recording");
  assert.equal(s.items[1].sizeLabel, "unknown");
});

test("deviceSummary: web -> null", () => {
  assert.equal(deviceSummary({ source: "web", app_version: "4.9.0", device_model: "Pixel 7", android_sdk: 34 }), null);
});

test("deviceSummary: undefined source -> null", () => {
  assert.equal(deviceSummary({}), null);
  assert.equal(deviceSummary({ source: null }), null);
});

test("deviceSummary: app with all parts joins in order", () => {
  assert.equal(
    deviceSummary({ source: "app", app_version: "4.9.0", device_model: "Pixel 7", android_sdk: 34 }),
    "App 4.9.0 · Pixel 7 · Android API 34",
  );
});

test("deviceSummary: app with only version", () => {
  assert.equal(deviceSummary({ source: "app", app_version: "4.9.0" }), "App 4.9.0");
});

test("deviceSummary: app with blanks -> literal fallback", () => {
  assert.equal(deviceSummary({ source: "app" }), "Sent from the Android app");
  assert.equal(
    deviceSummary({ source: "app", app_version: "", device_model: "  ", android_sdk: null }),
    "Sent from the Android app",
  );
});

test("deviceSummary: whitespace-only device_model skipped", () => {
  assert.equal(
    deviceSummary({ source: "app", app_version: "4.9.0", device_model: "   ", android_sdk: 34 }),
    "App 4.9.0 · Android API 34",
  );
});
