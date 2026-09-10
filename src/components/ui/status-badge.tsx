const STYLES: Record<string, string> = {
  draft: "bg-ink-300/20 text-ink-700",
  in_review: "bg-accent-100 text-accent-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-red-100 text-red-800",
  new: "bg-brand-100 text-brand-800",
  in_progress: "bg-accent-100 text-accent-800",
  resolved: "bg-green-100 text-green-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  disabled: "bg-ink-300/20 text-ink-700",
  pending: "bg-ink-300/20 text-ink-700",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  sent: "Notified",
  failed: "Notification failed",
  disabled: "Notifications off",
  pending: "Pending",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STYLES[status] ?? "bg-ink-300/20 text-ink-700"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
