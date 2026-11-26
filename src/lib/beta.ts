// Beta programme (WIP #269). Shared by the public /beta form and the admin pages.
// BETA_CAP and the consent wording must match supabase/functions/beta-apply/policy.ts.

export const BETA_CAP = 50;
/** Shared inbox for replies and deletion requests (WIP #269 D5, confirmed by Robert). */
export const SUPPORT_EMAIL = "hello@actorslines.app";

/** Shown beside the submit button; the same wording the function records as CONSENT_VERSION. */
export const BETA_CONSENT_LABEL =
  `I agree that Actors Lines may store these details to review my application and, if I'm accepted, to run the beta. I understand they are seen only by the developer, and I can ask for them to be deleted by writing to ${SUPPORT_EMAIL}.`;

export type BetaStatus = "pending" | "approved" | "rejected" | "withdrawn";

export const BETA_STATUS_LABELS: Record<BetaStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export interface BetaApplication {
  id: number;
  created_at: string;
  name: string;
  reason: string;
  email: string;
  google_email: string;
  town: string;
  actor_type: "professional" | "amateur";
  in_company: boolean;
  company_name: string | null;
  status: BetaStatus;
  decided_at: string | null;
  invite_sent_at: string | null;
  group_added: boolean;
  user_id: string | null;
  existing_user: boolean;
  reapplied: boolean;
  prior_application_id: number | null;
  consent_at: string;
  consent_version: string;
  notes: string | null;
}

/** Gmail and Google Workspace are both legitimate Google accounts, so a non-gmail domain only warns. */
export function isGmailDomain(email: string): boolean {
  return /@(gmail|googlemail)\.com$/i.test(email.trim());
}

export function placesLeft(approved: number): number {
  return Math.max(BETA_CAP - approved, 0);
}
