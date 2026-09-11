"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  retryEnquiryNotificationAction,
  updateEnquiryAction,
} from "@/app/admin/actions";

export function EnquiryRowActions({
  row,
  currentUserId,
}: {
  row: {
    id: string;
    status: string;
    assignedToId: string | null;
    notificationStatus: string;
  };
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Action failed.");
      return;
    }
    setMessage(success);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm font-bold text-ink-800">
        Status
        <select
          value={row.status}
          disabled={busy}
          onChange={(event) =>
            run(
              () =>
                updateEnquiryAction({
                  id: row.id,
                  status: event.target.value as "new" | "in_progress" | "resolved",
                }),
              "Status updated.",
            )
          }
          className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
        >
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-ink-800">
        Assigned to
        <select
          value={row.assignedToId ?? ""}
          disabled={busy}
          onChange={(event) =>
            run(
              () =>
                updateEnquiryAction({
                  id: row.id,
                  assignedToId: event.target.value === "me" ? currentUserId : null,
                }),
              "Assignment updated.",
            )
          }
          className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
        >
          <option value="">Unassigned</option>
          <option value="me">Me</option>
        </select>
      </label>
      {row.notificationStatus === "failed" && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => retryEnquiryNotificationAction({ id: row.id }),
              "Notification sent.",
            )
          }
          className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700 transition-soft hover:bg-red-50 disabled:opacity-60"
        >
          Retry email
        </button>
      )}
      {message && <p className="text-xs font-semibold text-green-800">{message}</p>}
      {error && (
        <p role="alert" className="basis-full text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
