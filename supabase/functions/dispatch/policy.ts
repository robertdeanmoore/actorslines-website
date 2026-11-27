// Pure policy helpers for the dispatch function (no Deno APIs, so node --test can import them).

/** Manual triage guard: one run per request per window (enforced by public.rate_limit_hit). */
export const TRIAGE_REQUEST_WINDOW = "5 minutes";

export function triageRequestBucket(requestId: number): string {
  return `triage-req:${requestId}`;
}

/** Turnstile is required for every caller except an admin on the manual triage action.
 *  `isAdmin` must come from the server-side profiles.role lookup, never from the client. */
export function captchaRequired(action: string, isAdmin: boolean): boolean {
  return !(action === "triage-report" && isAdmin);
}

/** The two request types (migration 0037). Support = something is wrong; Enhancement = something to improve. */
export const REQUEST_KINDS = ["enhancement", "support"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

/** Absent or null means "enhancement" so an older client keeps working; any other unknown value is refused (null). */
export function parseKind(v: unknown): RequestKind | null {
  if (v === undefined || v === null) return "enhancement";
  return typeof v === "string" && (REQUEST_KINDS as readonly string[]).includes(v) ? (v as RequestKind) : null;
}

export function kindLabel(kind: RequestKind): string {
  return kind === "support" ? "Support" : "Enhancement";
}

/** Server-to-server proof for the `triage-app` action: the bearer token must equal the project's
 *  service-role key. Compared without early exit so timing does not reveal how much matched.
 *  A missing or empty key never matches (fails closed); the key is never logged by callers. */
export function isServerCall(authHeader: string | null | undefined, serviceKey: string | null | undefined): boolean {
  if (typeof authHeader !== "string" || typeof serviceKey !== "string" || serviceKey.length === 0) return false;
  const m = /^Bearer (.+)$/.exec(authHeader);
  if (!m) return false;
  const token = m[1];
  let diff = token.length ^ serviceKey.length;
  for (let i = 0; i < serviceKey.length; i++) {
    diff |= (token.charCodeAt(i % token.length) ?? 0) ^ serviceKey.charCodeAt(i);
  }
  return diff === 0;
}
