// Client-side counterpart to the mfa-verify edge function (RobLife WIP #103
// Row 4, Holly's §5.1 finding) -- shared by LoginPage's post-password step-up
// and ProfilePage's first-enrolment confirmation, both of which used to call
// supabase.auth.mfa.challenge()/.verify() directly with zero app-level
// throttle.
//
// supabase.functions.invoke() resolves a non-2xx response as a
// FunctionsHttpError with `data: null`, not as parsed JSON -- the structured
// { ok, error, retryAfter } body this function's own edge function returns
// on failure only reaches the caller via error.context.json(), the pattern
// Supabase's own docs show for reading a function's JSON error body
// (supabase.com/docs/guides/functions/error-handling). Centralised here so
// both call sites get the real error message/retryAfter instead of a
// generic "something went wrong".

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type MfaVerifyResult =
  | { ok: true; session: { access_token: string; refresh_token: string } }
  | { ok: false; error: string; retryAfter?: number };

export async function verifyMfaCode(factorId: string, code: string): Promise<MfaVerifyResult> {
  const { data, error } = await supabase.functions.invoke("mfa-verify", {
    body: { factorId, code },
  });

  if (!error) {
    return data as MfaVerifyResult;
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return {
        ok: false,
        error: typeof body?.error === "string" ? body.error : "That code wasn't right — try again.",
        retryAfter: typeof body?.retryAfter === "number" ? body.retryAfter : undefined,
      };
    } catch {
      // Body wasn't JSON (network edge case, not the normal path) -- fall
      // through to the generic message below rather than throw.
    }
  }

  return { ok: false, error: "Could not reach the server. Check your connection and try again." };
}

export function mfaRetryMessage(result: Extract<MfaVerifyResult, { ok: false }>): string {
  return result.retryAfter
    ? `Too many attempts. Try again in ${Math.ceil(result.retryAfter / 60)} minute(s).`
    : result.error;
}
