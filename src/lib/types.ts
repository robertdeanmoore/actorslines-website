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
  status: "requested" | "draft" | "approved" | "implemented" | "failed";
  pr_url: string | null;
  created_at: string;
}

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
