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
