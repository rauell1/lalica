import Link from "next/link";

import { requireAdminPage } from "@/lib/auth/session";
import { listUsers } from "@/lib/users/service";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { UserRowActions } from "@/components/admin/user-row-actions";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const user = await requireAdminPage(["administrator"]);
  const users = await listUsers(user);

  const staff = users.filter((row) => row.role !== null);
  const unassigned = users.filter((row) => row.role === null);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
        User access
      </h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
        Access is invite only. A new account is inactive and has no role until
        an administrator assigns one here. Disabling an account takes effect
        immediately. The last active administrator cannot be removed or
        demoted.
      </p>

      <section aria-labelledby="staff-heading" className="mt-8">
        <h2 id="staff-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
          Staff accounts ({staff.length})
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-brand-100 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs tracking-wider text-ink-500 uppercase">
                <th scope="col" className="px-5 py-3">Name</th>
                <th scope="col" className="px-5 py-3">Email</th>
                <th scope="col" className="px-5 py-3">Role</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {staff.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink-900">{row.name}</p>
                    {row.id === user.id && (
                      <p className="text-xs text-ink-500">(you)</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{row.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                      {ROLE_LABELS[row.role!]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        row.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <UserRowActions
                      userId={row.id}
                      role={row.role!}
                      active={row.active}
                      isSelf={row.id === user.id}
                    />
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                    No staff accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {unassigned.length > 0 && (
        <section aria-labelledby="unassigned-heading" className="mt-10">
          <h2 id="unassigned-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
            Accounts without a role ({unassigned.length})
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            These accounts signed in once but have not been granted access.
            Assign a role to grant access, or leave them here.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-brand-100 bg-white">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs tracking-wider text-ink-500 uppercase">
                  <th scope="col" className="px-5 py-3">Name</th>
                  <th scope="col" className="px-5 py-3">Email</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {unassigned.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-5 py-3 font-semibold text-ink-900">{row.name}</td>
                    <td className="px-5 py-3 text-ink-500">{row.email}</td>
                    <td className="px-5 py-3 text-right">
                      <UserRowActions
                        userId={row.id}
                        role="editor"
                        active={row.active}
                        isSelf={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-10 rounded-lg border border-brand-100 bg-surface p-5 text-sm leading-6 text-ink-600">
        <p className="font-bold text-ink-800">First administrator bootstrap</p>
        <p className="mt-1">
          The first administrator is created by a documented one-time process,
          not by public registration: the owner signs in once through the
          staff sign-in page, then runs the bootstrap command with a server
          secret. See docs/authentication.md.
        </p>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        Need to change your own details? Ask another administrator, or use the
        provider (for example Google) account settings.
      </p>
      <p className="mt-2 text-xs text-ink-500">
        <Link href="/admin/audit" className="font-bold text-brand-700 underline hover:text-brand-600">
          View the audit history
        </Link>{" "}
        for every role and access change.
      </p>
    </div>
  );
}
