// Pure policy for `submit-request-app` (WIP #269 P4.2). No Deno APIs, no imports from outside this
// directory, so node --test can run it and the deploy wrapper accepts the function.

export const REQUEST_KINDS = ["enhancement", "support"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 4000;

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 3 * 1024 * 1024;

// Per-user limits (R3.5): 5 an hour, 20 a day. Windows are Postgres intervals for public.rate_limit_hit.
export const SUBMIT_PER_HOUR = 5;
export const SUBMIT_PER_DAY = 20;
export const UPLOAD_URLS_PER_HOUR = 10;
export const CONFIRM_PER_HOUR = 30;
export const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export type AttachmentKind = "image" | "audio";

type MimeRule = { kind: AttachmentKind; ext: string };
const MIME_RULES: Record<string, MimeRule> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "audio/mp4": { kind: "audio", ext: "m4a" },
  "audio/aac": { kind: "audio", ext: "aac" },
  "audio/ogg": { kind: "audio", ext: "ogg" },
  "audio/mpeg": { kind: "audio", ext: "mp3" },
};

export type DeclaredAttachment = { kind: AttachmentKind; mime: string; size: number };

export type ValidReport = {
  kind: RequestKind;
  subject: string;
  description: string;
  appVersion: string | null;
  deviceModel: string | null;
  androidSdk: number | null;
  attachments: DeclaredAttachment[];
};

export type Validation = { ok: true; value: ValidReport } | { ok: false; error: string };

export function parseKind(v: unknown): RequestKind | null {
  if (v === undefined || v === null) return "support"; // the in-app form defaults to Support (R4.2)
  return typeof v === "string" && (REQUEST_KINDS as readonly string[]).includes(v) ? (v as RequestKind) : null;
}

export function kindLabel(kind: RequestKind): string {
  return kind === "support" ? "Support" : "Enhancement";
}

export function extensionFor(mime: string): string | null {
  return MIME_RULES[mime]?.ext ?? null;
}

export function maxBytesFor(kind: AttachmentKind): number {
  return kind === "image" ? IMAGE_MAX_BYTES : AUDIO_MAX_BYTES;
}

function cleanText(v: unknown, max: number): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  return t.length === 0 ? null : t.slice(0, max);
}

/** Validates the `submit` body. Never throws; the first problem found is returned as a short message. */
export function validateSubmit(body: unknown): Validation {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  const kind = parseKind(b.kind);
  if (!kind) return { ok: false, error: 'Field "kind" must be "enhancement" or "support"' };

  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return { ok: false, error: `Field "subject" must be ${SUBJECT_MIN}-${SUBJECT_MAX} characters` };
  }
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    return { ok: false, error: `Field "description" must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters` };
  }

  let androidSdk: number | null = null;
  if (b.android_sdk !== undefined && b.android_sdk !== null) {
    if (!Number.isInteger(b.android_sdk) || (b.android_sdk as number) < 1 || (b.android_sdk as number) > 99) {
      return { ok: false, error: 'Field "android_sdk" must be a whole number from 1 to 99' };
    }
    androidSdk = b.android_sdk as number;
  }

  const attachments: DeclaredAttachment[] = [];
  if (b.attachments !== undefined && b.attachments !== null) {
    if (!Array.isArray(b.attachments) || b.attachments.length > 2) {
      return { ok: false, error: "At most one screenshot and one audio file" };
    }
    for (const raw of b.attachments) {
      const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const rule = typeof a.mime === "string" ? MIME_RULES[a.mime] : undefined;
      if (!rule) return { ok: false, error: "Attachment type not allowed" };
      if (a.kind !== rule.kind) return { ok: false, error: "Attachment kind does not match its type" };
      if (!Number.isInteger(a.size) || (a.size as number) <= 0) return { ok: false, error: "Attachment size missing" };
      if ((a.size as number) > maxBytesFor(rule.kind)) return { ok: false, error: "Attachment too large" };
      if (attachments.some((x) => x.kind === rule.kind)) return { ok: false, error: "At most one screenshot and one audio file" };
      attachments.push({ kind: rule.kind, mime: a.mime as string, size: a.size as number });
    }
  }

  return {
    ok: true,
    value: {
      kind, subject, description,
      appVersion: cleanText(b.app_version, 40),
      deviceModel: cleanText(b.device_model, 80),
      androidSdk,
      attachments,
    },
  };
}

/**
 * Maps the in-app report onto the enhancement_requests columns (their NOT NULL fields). Migration 0040 lets
 * source = 'app' rows carry a 3-120 character title and a 10-4000 character goal.
 */
export function toRequestRow(userId: string, r: ValidReport) {
  return {
    author_id: userId,
    kind: r.kind,
    title: r.subject,
    goal: r.description,
    where_in_app: "Android app",
    how_it_works: "Sent from the in-app report form (no further steps given).",
    source: "app" as const,
    app_version: r.appVersion,
    device_model: r.deviceModel,
    android_sdk: r.androidSdk,
    attachments_complete: r.attachments.length === 0,
  };
}

/**
 * D3 (Robert, 2026-11-26): a tester whose licence has expired or been withdrawn may still send reports
 * while the account exists. The licence is deliberately not an input: only a signed-in, existing user.
 */
export function mayReport(user: { id?: string | null } | null | undefined): boolean {
  return typeof user?.id === "string" && user.id.length > 0;
}

export function submitBuckets(userId: string): { hour: string; day: string } {
  return { hour: `app-submit-h:${userId}`, day: `app-submit-d:${userId}` };
}

export function uploadUrlsBucket(userId: string): string {
  return `app-upload-urls-h:${userId}`;
}

export function confirmBucket(userId: string): string {
  return `app-confirm-h:${userId}`;
}

/** Same author, same subject and description, created within the duplicate window: treat as a double tap. */
export function isDuplicateWithin(createdAtIso: string, nowMs: number, windowMs = DUPLICATE_WINDOW_MS): boolean {
  const t = Date.parse(createdAtIso);
  return Number.isFinite(t) && nowMs - t >= 0 && nowMs - t < windowMs;
}

export function duplicateSinceIso(nowMs: number, windowMs = DUPLICATE_WINDOW_MS): string {
  return new Date(nowMs - windowMs).toISOString();
}

/** `request/{request_id}/{uuid}.{ext}`: matches the CHECK on request_attachments.storage_path (migration 0040). */
export function storagePathFor(requestId: number, uuid: string, mime: string): string | null {
  const ext = extensionFor(mime);
  if (!ext || !Number.isInteger(requestId) || requestId <= 0) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) return null;
  return `request/${requestId}/${uuid}.${ext}`;
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/** The MIME families the file's own first bytes prove (declared types are never trusted). */
export function sniffMime(bytes: Uint8Array): string[] {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return ["image/jpeg"];
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return ["image/png"];
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return ["image/webp"];
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return ["audio/mp4"];          // "ftyp" box: m4a/mp4
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return ["audio/ogg"];             // "OggS"
  if (startsWith(bytes, [0x49, 0x44, 0x33])) return ["audio/mpeg"];                  // ID3 tag then MP3
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return ["audio/aac"]; // ADTS
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return ["audio/mpeg"]; // MPEG frame sync
  return [];
}

export type FileVerdict = { ok: true } | { ok: false; reason: "too_large" | "empty" | "type_mismatch" };

/** AC4.7: size within the per-kind cap and the content matches the declared type. */
export function checkUploadedFile(declared: { kind: AttachmentKind; mime: string; size: number }, bytes: Uint8Array, actualSize: number): FileVerdict {
  if (actualSize <= 0 || bytes.length === 0) return { ok: false, reason: "empty" };
  if (actualSize > maxBytesFor(declared.kind)) return { ok: false, reason: "too_large" };
  return sniffMime(bytes).includes(declared.mime) ? { ok: true } : { ok: false, reason: "type_mismatch" };
}
