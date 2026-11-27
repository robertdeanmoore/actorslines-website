export const ATTACHMENT_BUCKET = "request-attachments";
export const SIGNED_URL_SECONDS = 300;

export type AttachmentKind = "image" | "audio";
export type AttachmentStatus = "pending" | "confirmed" | "rejected";

export interface AttachmentRow {
  id: number;
  request_id: number;
  kind: AttachmentKind;
  declared_mime: string;
  declared_size: number;
  storage_path: string;
  status: AttachmentStatus;
  created_at: string;
  confirmed_at: string | null;
}

export type AttachmentState = "viewable" | "incomplete" | "rejected";

export interface AttachmentItem {
  id: number;
  kind: AttachmentKind;
  state: AttachmentState;
  label: string;
  sizeLabel: string;
}

export interface AttachmentSummary {
  items: AttachmentItem[];
  incompleteFlag: boolean;
  headline: string;
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "Screenshot",
  audio: "Audio recording",
};

const KIND_ORDER: Record<AttachmentKind, number> = { image: 0, audio: 1 };

const STATE_BY_STATUS: Record<AttachmentStatus, AttachmentState> = {
  confirmed: "viewable",
  pending: "incomplete",
  rejected: "rejected",
};

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "unknown";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function attachmentState(row: AttachmentRow): AttachmentState {
  return STATE_BY_STATUS[row.status];
}

export function summariseAttachments(
  rows: AttachmentRow[],
  attachmentsComplete: boolean | null | undefined,
): AttachmentSummary {
  const items: AttachmentItem[] = rows
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      state: attachmentState(row),
      label: KIND_LABEL[row.kind],
      sizeLabel: formatBytes(row.declared_size),
    }))
    .sort((a, b) => {
      const diff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      return diff !== 0 ? diff : a.id - b.id;
    });

  const hasPending = rows.some((row) => row.status === "pending");
  const incompleteFlag = attachmentsComplete === false || hasPending;

  let headline: string;
  if (rows.length === 0 && !incompleteFlag) {
    headline = "No attachments";
  } else if (incompleteFlag) {
    headline = "Attachment upload incomplete";
  } else {
    headline = rows.length === 1 ? "1 attachment" : `${rows.length} attachments`;
  }

  return { items, incompleteFlag, headline };
}

export function deviceSummary(req: {
  source?: string | null;
  app_version?: string | null;
  device_model?: string | null;
  android_sdk?: number | null;
}): string | null {
  if (req.source !== "app") return null;
  const parts: string[] = [];
  if (req.app_version && req.app_version.trim()) parts.push(`App ${req.app_version.trim()}`);
  if (req.device_model && req.device_model.trim()) parts.push(req.device_model.trim());
  if (req.android_sdk != null) parts.push(`Android API ${req.android_sdk}`);
  return parts.length > 0 ? parts.join(" · ") : "Sent from the Android app";
}
