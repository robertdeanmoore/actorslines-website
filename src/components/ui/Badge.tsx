import type { ReactNode } from "react";
import { STATUS_LABELS, type RequestStatus } from "../../lib/types";

export type BadgeTone = "neutral" | "info" | "ok" | "warn" | "danger" | "lilac";

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return <span className={cx("al-badge", `al-badge--${tone}`, className)}>{children}</span>;
}

export interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const STATUS_TONE: Record<RequestStatus, BadgeTone | "closed"> = {
  submitted: "neutral",
  reported: "info",
  published: "lilac",
  planned: "lilac",
  implemented: "ok",
  closed: "closed",
  rejected: "danger",
  abandoned: "warn",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = STATUS_TONE[status];

  return (
    <span className={cx("al-badge", `al-badge--${tone}`, className)}>
      {status === "planned" ? <span aria-hidden="true" className="al-badge__dot" /> : null}
      {STATUS_LABELS[status]}
    </span>
  );
}

export default Badge;
