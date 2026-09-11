"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContentRow } from "@/lib/content/service";
import {
  archiveContentAction,
  deleteContentAction,
  publishContentAction,
  restoreContentAction,
  unpublishContentAction,
} from "@/app/admin/actions";
import { Dialog } from "@/components/ui/dialog";

export function ContentRowActions({
  row,
  canPublish,
}: {
  row: ContentRow;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"unpublish" | "archive" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setError(result.error ?? "Action failed.");
      return;
    }
    router.refresh();
  }

  const base = row.type === "csr_story" ? "csr" : row.type === "news" ? "news" : `${row.type}s`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <a
        href={`/${base}/${row.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50 ${
          row.status !== "published" ? "pointer-events-none opacity-40" : ""
        }`}
        aria-disabled={row.status !== "published"}
      >
        View
      </a>
      <a
        href={`/admin/${base}/${row.id}/preview`}
        className="rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50"
      >
        Preview
      </a>
      {canPublish && row.status !== "published" && row.status !== "archived" && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => publishContentAction({ id: row.id, type: row.type }))
          }
          className="rounded-md bg-brand-700 px-2.5 py-1.5 text-xs font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
        >
          Publish
        </button>
      )}
      {canPublish && row.status === "published" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirm("unpublish")}
          className="rounded-md border border-accent-600 px-2.5 py-1.5 text-xs font-bold text-accent-800 transition-soft hover:bg-accent-50 disabled:opacity-60"
        >
          Unpublish
        </button>
      )}
      {row.status !== "archived" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirm("archive")}
          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-soft hover:bg-red-50 disabled:opacity-60"
        >
          Archive
        </button>
      )}
      {row.status === "archived" && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => restoreContentAction({ id: row.id, type: row.type }))}
            className="rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50 disabled:opacity-60"
          >
            Restore
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("delete")}
            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-soft hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="basis-full text-right text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === "unpublish"
            ? "Unpublish this item?"
            : confirm === "archive"
              ? "Archive this item?"
              : "Delete this item permanently?"
        }
      >
        <p className="text-sm leading-6 text-ink-700">
          {confirm === "unpublish" &&
            "The item disappears from the public site and its listings, sitemap, and metadata. The published snapshot is kept for reference."}
          {confirm === "archive" &&
            "Archiving removes the item from the public site and from the active workflow. You can restore it later."}
          {confirm === "delete" &&
            "This removes the archived item permanently. This cannot be undone."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirm(null)}
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-bold text-ink-700 transition-soft hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                confirm === "unpublish"
                  ? unpublishContentAction({ id: row.id, type: row.type, slug: row.slug })
                  : confirm === "archive"
                    ? archiveContentAction({ id: row.id, type: row.type, slug: row.slug })
                    : deleteContentAction({ id: row.id, type: row.type }),
              )
            }
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white transition-soft hover:bg-red-600 disabled:opacity-60"
          >
            {busy ? "Working..." : "Confirm"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
