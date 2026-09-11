"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setUserActiveAction, setUserRoleAction } from "@/app/admin/actions";
import type { UserRole } from "@/lib/db";
import { Dialog } from "@/components/ui/dialog";

export function UserRowActions({
  userId,
  role,
  active,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"disable" | "enable" | "role" | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>(role);
  const [error, setError] = useState<string | null>(null);

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
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        value={role}
        onChange={(event) => {
          setNextRole(event.target.value as UserRole);
          setConfirm("role");
        }}
        disabled={busy || isSelf}
        aria-label="Change role"
        className="rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-bold text-ink-800 disabled:opacity-50"
      >
        <option value="administrator">Administrator</option>
        <option value="editor">Editor</option>
        <option value="enquiry_manager">Enquiry Manager</option>
      </select>
      {active ? (
        <button
          type="button"
          disabled={busy || isSelf}
          onClick={() => setConfirm("disable")}
          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-soft hover:bg-red-50 disabled:opacity-50"
        >
          Disable
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirm("enable")}
          className="rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50 disabled:opacity-50"
        >
          Enable
        </button>
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
          confirm === "disable"
            ? "Disable this account?"
            : confirm === "enable"
              ? "Enable this account?"
              : "Change this user's role?"
        }
      >
        <p className="text-sm leading-6 text-ink-700">
          {confirm === "disable" &&
            "The user loses access immediately and cannot sign in until an administrator enables the account again. Open sessions stop working on their next request."}
          {confirm === "enable" && "The user can sign in again with their existing account."}
          {confirm === "role" &&
            "Role changes apply immediately. The last active administrator cannot be removed or demoted."}
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
                confirm === "role"
                  ? setUserRoleAction({ userId, role: nextRole })
                  : setUserActiveAction({ userId, active: confirm === "enable" }),
              )
            }
            className={`rounded-md px-4 py-2 text-sm font-bold text-white transition-soft disabled:opacity-60 ${
              confirm === "disable" ? "bg-red-700 hover:bg-red-600" : "bg-brand-700 hover:bg-brand-600"
            }`}
          >
            {busy ? "Working..." : "Confirm"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
