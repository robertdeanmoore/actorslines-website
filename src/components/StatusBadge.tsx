import type { RequestStatus } from "../lib/types";
import { STATUS_LABELS } from "../lib/types";

const COLORS: Record<RequestStatus, string> = {
  submitted: "bg-gray-200 text-gray-700",
  reported: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  planned: "bg-purple-100 text-purple-800",
  implemented: "bg-emerald-200 text-emerald-900",
  closed: "bg-gray-300 text-gray-600",
  rejected: "bg-red-100 text-red-800",
  abandoned: "bg-amber-100 text-amber-800",
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
