export type RequestStatus =
  | "submitted" | "reported" | "published" | "planned"
  | "implemented" | "closed" | "rejected" | "abandoned";

export interface Profile {
  id: string;
  display_name: string;
  role: "user" | "admin";
  created_at: string;
  last_seen_at: string;
}

export interface EnhancementRequest {
  id: number;
  author_id: string;
  status: RequestStatus;
  title: string;
  goal: string;
  where_in_app: string;
  how_it_works: string;
  usage_frequency: string;
  extra_notes: string;
  created_at: string;
}

export interface RequestMessage {
  id: number;
  request_id: number;
  author_kind: "user" | "admin" | "system";
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface AiReport {
  id: number;
  request_id: number;
  report_md: string;
  summary_draft: string;
  created_at: string;
}

export interface BoardPost {
  id: number;
  request_id: number;
  summary: string;
  published_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: string | null;
  body: string;
  hidden_by_admin: boolean;
  created_at: string;
}

export interface DevNote {
  id: number;
  request_id: number;
  body: string;
  created_at: string;
}

export interface Plan {
  id: number;
  request_id: number;
  iteration: number;
  prompt: string;
  repo_path: string | null;
  plan_md: string | null;
  status: "requested" | "draft" | "approved" | "implemented" | "failed";
  pr_url: string | null;
  created_at: string;
}

export interface Invite {
  id: number;
  email: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
}

// ── Box Office: licensing ──────────────────────────────────────────────────────
// Mirrors the ActorsVoice repo's docs/monetization/tier-capability-matrix.md and
// data/entitlement/Entitlements.kt -- see docs/plans/box-office-phase-1.md.

export type ProductCode =
  | "free" | "group_member" | "single_play_6mo" | "trial_30d"
  | "unlimited_6mo" | "group_master" | "comp_rolling" | "admin_full";

export interface Entitlements {
  canImportScripts: boolean;
  canRunScenes: boolean;
  canUseTts: boolean;
  canUseSelftape: boolean;
  canExportCast: boolean;
  canCreatePlays: boolean;
  maxActivePlays: number | null;
}

export interface Product {
  code: ProductCode;
  label: string;
  rank: number;
  duration_days: number | null;
  price_pence: number;
  capabilities: Entitlements;
  active: boolean;
}

export type LicenceSource = "trial" | "purchase" | "admin" | "group" | "reward" | "play_billing";
export type LicenceStatus = "active" | "revoked" | "refunded";

export interface Licence {
  id: number;
  user_id: string;
  product_code: ProductCode;
  starts_at: string;
  ends_at: string;
  source: LicenceSource;
  status: LicenceStatus;
  price_paid_pence: number | null;
  order_ref: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface LicenceAuditRow {
  id: number;
  licence_id: number | null;
  actor: string | null;
  action: "granted" | "revoked" | "updated" | "redeemed" | "redeem_failed";
  via: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface EntitlementsResult {
  tierLabel: string;
  licenceEndsAtEpochMs: number | null;
  entitlements: Entitlements;
}

export interface RedemptionCode {
  id: number;
  code_hint: string;
  product_code: ProductCode;
  expires_at: string | null;
  max_uses: number;
  redeemed_count: number;
  created_at: string;
}

export const PRODUCT_LABELS: Record<ProductCode, string> = {
  free: "Free",
  group_member: "Group member",
  single_play_6mo: "Single Play",
  trial_30d: "Trial",
  unlimited_6mo: "Unlimited",
  group_master: "Group master",
  comp_rolling: "Complimentary",
  admin_full: "Admin",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  reported: "AI report ready",
  published: "On the board",
  planned: "Plan ready",
  implemented: "Implemented",
  closed: "Closed",
  rejected: "Rejected",
  abandoned: "Abandoned",
};
