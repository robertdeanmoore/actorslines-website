// Pure helpers for the beta-apply function (no Deno APIs, so node --test can import them).
// Wording of the emails and the consent text: WIP #269 plan section 4 (approved by Robert, D9).

/** Total places in the beta programme (admin sees places left; the public never does). */
export const BETA_CAP = 50;
/** A rejected applicant may apply again after this many days (WIP #269 D4, EC2.4). */
export const REAPPLY_AFTER_DAYS = 90;
/** Shared inbox for replies and deletion requests (WIP #269 D5, confirmed by Robert 2026-11-26). */
export const REPLY_TO = "hello@actorslines.app";
export const SITE_URL = "https://actorslines.app";
/** Stored with each row as the record of which consent wording was shown. */
export const CONSENT_VERSION = "2026-11-26-v1";

export const LIMITS = {
  name: [1, 120],
  reason: [20, 1000],
  town: [1, 120],
  company_name: [1, 120],
} as const;

const MAX_EMAIL = 254;
// Pragmatic format check, same as notify-list; the invite email later proves ownership.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export type CleanApplication = {
  name: string;
  reason: string;
  email: string;
  google_email: string;
  town: string;
  actor_type: "professional" | "amateur";
  in_company: boolean;
  company_name: string | null;
};

export type Validation = { ok: true; clean: CleanApplication } | { ok: false; error: string };

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validEmail(v: string): boolean {
  return v.length >= 6 && v.length <= MAX_EMAIL && EMAIL_RE.test(v);
}

/** Server-side validation. The browser form checks the same rules for friendlier messages. */
export function validateApplication(body: Record<string, unknown>): Validation {
  const name = text(body.name);
  const reason = text(body.reason);
  const town = text(body.town);
  const email = text(body.email).toLowerCase();
  const sameGoogle = body.same_google_email === true;
  const googleEmail = sameGoogle ? email : text(body.google_email).toLowerCase();

  const lenErr = (label: string, v: string, [min, max]: readonly [number, number]) =>
    v.length < min || v.length > max ? `${label} must be ${min} to ${max} characters` : null;
  const err = lenErr("Name", name, LIMITS.name) ?? lenErr("Reason", reason, LIMITS.reason) ??
    lenErr("Town", town, LIMITS.town);
  if (err) return { ok: false, error: err };
  if (!validEmail(email)) return { ok: false, error: "Please enter a valid email address" };
  if (!validEmail(googleEmail)) return { ok: false, error: "Please enter a valid Google account email address" };
  if (body.actor_type !== "professional" && body.actor_type !== "amateur") {
    return { ok: false, error: "Please say whether you are a professional or an amateur actor" };
  }
  if (typeof body.in_company !== "boolean") {
    return { ok: false, error: "Please say whether you are a member of a company" };
  }
  let company: string | null = null;
  if (body.in_company) {
    company = text(body.company_name);
    const cErr = lenErr("Company name", company, LIMITS.company_name);
    if (cErr) return { ok: false, error: cErr };
  }
  if (body.consent !== true) return { ok: false, error: "Please tick the box to agree" };
  return {
    ok: true,
    clean: {
      name, reason, email, google_email: googleEmail, town,
      actor_type: body.actor_type, in_company: body.in_company, company_name: company,
    },
  };
}

/** True when a previous application decided at `decidedAt` still blocks a new one. */
export function withinReapplyWindow(decidedAt: string | null, now: Date = new Date()): boolean {
  if (!decidedAt) return true;
  const t = Date.parse(decidedAt);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t < REAPPLY_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

const FIRST_NAME_RE = /^[\p{L}'’-]{1,40}$/u;

/** Greeting name: the first token only when it looks like a name (letters, apostrophe, hyphen); else "there". */
export function firstName(name: string): string {
  const token = name.trim().split(/\s+/)[0] ?? "";
  return FIRST_NAME_RE.test(token) ? token : "there";
}

/** Subject lines must be a single line (no header injection) and bounded. */
export function oneLine(s: string, max = 100): string {
  return s.replace(/[\r\n\u2028\u2029]+/g, " ").slice(0, max);
}

export function applicantReply(name: string): { subject: string; text: string } {
  return {
    subject: "We've received your Actors Lines beta application",
    text: `Hello ${oneLine(firstName(name), 60)},\n\n` +
      `Thank you for applying to test Actors Lines. This is just to say your application has arrived.\n\n` +
      `I read every application myself and will reply once I've reviewed it. I may write to you first if I have a question. Places are limited, so it may take a little while.\n\n` +
      `You don't need to do anything else for now. Please don't reply to this automatic message; if you need to reach me, write to ${REPLY_TO}.\n\n` +
      `We've kept the details you gave only to review your application. You can ask us to delete them at any time by writing to the address above.\n\n` +
      `Rob Moore, You Never Know Productions\n`,
  };
}

export function notifyEmail(
  app: CleanApplication, id: number, used: number,
): { subject: string; text: string } {
  const left = Math.max(BETA_CAP - used, 0);
  return {
    subject: `New beta application: ${oneLine(app.name, 60)}, ${oneLine(app.town, 60)}`,
    text: `New Actors Lines beta application.\n\n` +
      `Name: ${app.name}\nTown: ${app.town}\n` +
      `Actor: ${app.actor_type === "professional" ? "Professional" : "Amateur"}\n` +
      `Company: ${app.company_name ?? "None"}\nEmail: ${app.email}\nGoogle account: ${app.google_email}\n` +
      `Places used: ${used} of ${BETA_CAP} (${left} left)\n\n` +
      `Reason:\n${app.reason}\n\n` +
      `Open it, accept or reject: ${SITE_URL}/admin/beta/${id}\n(Sign in as admin first.)\n`,
  };
}
