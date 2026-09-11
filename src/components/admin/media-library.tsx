"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { put } from "@vercel/blob/client";

import {
  deleteMediaAction,
  setMediaStatusAction,
  updateMediaAction,
} from "@/app/admin/actions";

interface MediaRow {
  id: string;
  altText: string;
  caption: string | null;
  sourceNote: string | null;
  rightsStatus: string;
  status: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: Date;
}

const RIGHTS_OPTIONS = [
  ["unconfirmed", "Unconfirmed: review before publishing"],
  ["cleared", "Cleared: rights and permission confirmed"],
  ["illustrative", "Illustrative: licensed or generic, not documentary"],
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaRowActions({
  row,
}: {
  row: MediaRow;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"delete" | null>(null);
  const [editing, setEditing] = useState(false);
  const [altText, setAltText] = useState(row.altText);
  const [caption, setCaption] = useState(row.caption ?? "");
  const [sourceNote, setSourceNote] = useState(row.sourceNote ?? "");
  const [rightsStatus, setRightsStatus] = useState(row.rightsStatus);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setError(result.error ?? "Action failed.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50"
      >
        Edit
      </button>
      {row.status === "draft" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => setMediaStatusAction({ id: row.id, status: "published" }))
          }
          className="rounded-md bg-brand-700 px-2.5 py-1.5 text-xs font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
        >
          Publish
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => setMediaStatusAction({ id: row.id, status: "draft" }))
          }
          className="rounded-md border border-accent-600 px-2.5 py-1.5 text-xs font-bold text-accent-800 transition-soft hover:bg-accent-50 disabled:opacity-60"
        >
          Unpublish
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirm("delete")}
        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-soft hover:bg-red-50 disabled:opacity-60"
      >
        Delete
      </button>
      {error && (
        <p role="alert" className="basis-full text-right text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setEditing(false)}
            className="absolute inset-0 bg-brand-950/60"
          />
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
              Image details
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-ink-800">
                Alt text
                <textarea
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  rows={2}
                  maxLength={200}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
                />
              </label>
              <label className="block text-sm font-bold text-ink-800">
                Caption (optional)
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={200}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
                />
              </label>
              <label className="block text-sm font-bold text-ink-800">
                Source note (optional)
                <input
                  value={sourceNote}
                  onChange={(event) => setSourceNote(event.target.value)}
                  maxLength={200}
                  placeholder="For example: Lalica company profile, page 9"
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
                />
              </label>
              <label className="block text-sm font-bold text-ink-800">
                Rights status
                <select
                  value={rightsStatus}
                  onChange={(event) => setRightsStatus(event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-ink-900"
                >
                  {RIGHTS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-bold text-ink-700 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    updateMediaAction({
                      id: row.id,
                      altText,
                      caption,
                      sourceNote,
                      rightsStatus: rightsStatus as
                        | "cleared"
                        | "unconfirmed"
                        | "illustrative",
                    }),
                  )
                }
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirm(null)}
            className="absolute inset-0 bg-brand-950/60"
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
              Delete this image?
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              Deleting is blocked while published content still references
              this image. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-bold text-ink-700 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteMediaAction({ id: row.id }))}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {busy ? "Working..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaUploadDialog({
  onDone,
  onClose,
}: {
  onDone: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [rightsStatus, setRightsStatus] = useState("unconfirmed");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }
    if (!altText.trim()) {
      setError("Alt text is required for every uploaded image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const authorizeResponse = await fetch("/api/media/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type }),
      });
      const authorization = (await authorizeResponse.json()) as {
        ok: boolean;
        error?: string;
        mode?: "local" | "client";
        ticket?: string;
        pathname?: string;
        token?: unknown;
      };
      if (!authorization.ok || !authorization.mode) {
        setError(authorization.error ?? "Upload could not be authorised.");
        return;
      }

      if (authorization.mode === "local" && authorization.ticket) {
        const form = new FormData();
        form.append("ticket", authorization.ticket);
        form.append("file", file);
        form.append("altText", altText.trim());
        form.append("caption", caption.trim());
        form.append("sourceNote", sourceNote.trim());
        form.append("rightsStatus", rightsStatus);
        const response = await fetch("/api/media/upload", { method: "POST", body: form });
        const result = (await response.json()) as { ok: boolean; error?: string };
        if (!result.ok) {
          setError(result.error ?? "Upload failed.");
          return;
        }
      } else if (authorization.mode === "client" && authorization.pathname && authorization.token) {
        const blob = await put(authorization.pathname, file, {
          access: "public",
          token: String(authorization.token),
        });
        const response = await fetch("/api/media/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname: authorization.pathname,
            url: blob.url,
            mimeType: file.type,
            altText: altText.trim(),
            caption: caption.trim(),
            sourceNote: sourceNote.trim(),
            rightsStatus,
          }),
        });
        const result = (await response.json()) as { ok: boolean; error?: string };
        if (!result.ok) {
          setError(result.error ?? "Upload failed.");
          return;
        }
      } else {
        setError("Upload could not be authorised.");
        return;
      }
      onDone();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-brand-950/60"
      />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
            Upload an image
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-500 hover:bg-surface"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-bold text-ink-800">
            Image file
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
            />
          </label>
          <p className="text-xs leading-5 text-ink-500">
            JPEG, PNG, or WebP only, up to 10 MB. SVG and document uploads are
            disabled until a safe validation path is added.
          </p>
          <label className="block text-sm font-bold text-ink-800">
            Alt text (required)
            <textarea
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              rows={2}
              maxLength={200}
              className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
            />
          </label>
          <label className="block text-sm font-bold text-ink-800">
            Caption (optional)
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
            />
          </label>
          <label className="block text-sm font-bold text-ink-800">
            Source note (optional)
            <input
              value={sourceNote}
              onChange={(event) => setSourceNote(event.target.value)}
              maxLength={200}
              placeholder="For example: Lalica company profile, page 9"
              className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-ink-900"
            />
          </label>
          <label className="block text-sm font-bold text-ink-800">
            Rights status
            <select
              value={rightsStatus}
              onChange={(event) => setRightsStatus(event.target.value)}
              className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-ink-900"
            >
              {RIGHTS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-bold text-ink-700 hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleUpload}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { formatBytes };
