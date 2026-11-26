// Pure helpers for the beta-decide function (no Deno APIs, so node --test can import them).

import { BETA_CAP, SITE_URL } from "../beta-apply/policy.ts";

export const ACTIONS = ["accept", "reject", "resend_invite", "group_added", "withdraw", "reopen"] as const;
export type DecideAction = typeof ACTIONS[number];

export const MAX_INTERNAL_NOTE = 1000;

export type ParsedRequest =
  | { ok: true; action: DecideAction; id: number; note: string | null }
  | { ok: false; error: string };

/** Validates the request body shape only. Authorisation is checked before this is trusted. */
export function parseRequest(body: unknown): ParsedRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;
  const action = ACTIONS.find((a) => a === b.action);
  if (!action) return { ok: false, error: "Unknown action" };
  const id = b.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) return { ok: false, error: "A valid application id is required" };
  let note: string | null = null;
  if (b.internal_note !== undefined && b.internal_note !== null) {
    if (typeof b.internal_note !== "string") return { ok: false, error: "Invalid note" };
    const trimmed = b.internal_note.trim();
    if (trimmed.length > MAX_INTERNAL_NOTE) return { ok: false, error: `Note must be at most ${MAX_INTERNAL_NOTE} characters` };
    note = trimmed === "" ? null : trimmed;
  }
  return { ok: true, action, id, note };
}

export type AcceptResult = "approved" | "already" | "cap_full" | "not_pending" | "not_found";

/** Maps the beta_accept RPC result to an HTTP outcome. `proceed` means: send the decision email. */
export function acceptOutcome(result: unknown): { status: number; error?: string; proceed: boolean; already?: boolean } {
  switch (result) {
    case "approved": return { status: 200, proceed: true };
    case "already": return { status: 200, proceed: false, already: true };
    case "cap_full": return { status: 409, proceed: false, error: `All ${BETA_CAP} places are taken` };
    case "not_pending": return { status: 409, proceed: false, error: "Only a pending application can be accepted" };
    case "not_found": return { status: 404, proceed: false, error: "Application not found" };
    default: return { status: 500, proceed: false, error: "Unexpected result" };
  }
}

export function inviteLink(token: string): string {
  return `${SITE_URL}/invite/${token}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "10 December 2026" (UTC), for the invite expiry line. Hand-built so it does not depend on the runtime's ICU data. */
export function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
