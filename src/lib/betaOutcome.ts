// Beta programme (WIP #269): pure decision-outcome types and wording for the
// beta-decide edge function's admin client. Kept free of the supabase import
// so node --test can load it directly.

export type BetaAction = "accept" | "reject" | "resend_invite" | "group_added" | "withdraw" | "reopen";

export type BetaDecideResult =
  | {
      ok: true;
      status: string;
      emailSent: boolean | null;
      already: boolean;
      grantApplied: boolean | null;
      licenceRevoked: boolean | null;
    }
  | { ok: false; error: string };

export type BetaDecideOk = Extract<BetaDecideResult, { ok: true }>;

export type OutcomeTone = "success" | "warning";

export function describeOutcome(action: BetaAction, r: BetaDecideOk): { tone: OutcomeTone; message: string } {
  if (r.already) return { tone: "success", message: "Nothing changed: it was already done." };
  if (action === "accept") {
    if (r.grantApplied === false) {
      return {
        tone: "warning",
        message: "Accepted, but the licence could not be added yet. Grant it by hand on the licences page.",
      };
    }
    if (r.emailSent === false) {
      return { tone: "warning", message: "Accepted, but the email could not be sent. Use Resend invite." };
    }
    return { tone: "success", message: "Accepted. The invitation email has been sent." };
  }
  if (action === "reject") {
    if (r.emailSent === false) {
      return { tone: "warning", message: "Rejected, but the email could not be sent. Write to the applicant yourself." };
    }
    return { tone: "success", message: "Rejected. The email has been sent." };
  }
  if (action === "resend_invite") {
    return { tone: "success", message: "A fresh invitation has been sent. The old link no longer works." };
  }
  if (action === "group_added") {
    return { tone: "success", message: "Saved. The applicant has been emailed the Google Play link." };
  }
  if (action === "withdraw") {
    if (r.licenceRevoked === false) {
      return {
        tone: "warning",
        message: "Withdrawn, but the licence could not be revoked. Revoke it on the licences page.",
      };
    }
    return { tone: "success", message: "Withdrawn. The place is free again." };
  }
  return { tone: "success", message: "Moved back to pending." };
}
