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
