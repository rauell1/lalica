import Link from "next/link";
import { desc } from "drizzle-orm";

import { requireAdminPage } from "@/lib/auth/session";
import { auditLog, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditAdminPage() {
  await requireAdminPage(["administrator"]);

  const db = getDb();
  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
        Audit history
      </h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
        Every sensitive action is recorded: sign-ins, role and access changes,
        content publishing and unpublishing, settings changes, media changes,
        enquiry exports, and deletion runs. The latest 200 entries are shown.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-brand-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-xs tracking-wider text-ink-500 uppercase">
              <th scope="col" className="px-5 py-3">When (UTC)</th>
              <th scope="col" className="px-5 py-3">Actor</th>
              <th scope="col" className="px-5 py-3">Action</th>
              <th scope="col" className="px-5 py-3">Target</th>
              <th scope="col" className="px-5 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-5 py-3 whitespace-nowrap text-ink-500">
                  {row.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="px-5 py-3 text-ink-700">
                  {row.actorId ? row.actorId.slice(0, 8) : "system"}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                    {row.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {row.entityType}
                  {row.entityId ? ` ${row.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="max-w-md px-5 py-3 text-ink-700">
                  <pre className="overflow-x-auto text-xs leading-5 whitespace-pre-wrap">
                    {typeof row.metadata === "string"
                      ? row.metadata
                      : JSON.stringify(row.metadata ?? {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-500">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        Audit entries cannot be edited or deleted through the CMS.{" "}
        <Link href="/admin/users" className="font-bold text-brand-700 underline hover:text-brand-600">
          Manage user access
        </Link>
      </p>
    </div>
  );
}
