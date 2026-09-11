import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";

import { requireAdminPage } from "@/lib/auth/session";
import { runAsActor, content, enquiries } from "@/lib/db";
import { CONTENT_TYPE_LABELS } from "@/lib/content/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireAdminPage(["administrator", "editor", "enquiry_manager"]);

  const { contentCounts, enquiryRows, failedNotifications, recent } =
    await runAsActor(user.id, async (db) => {
      const contentCounts = await db
        .select({
          type: content.type,
          status: content.status,
          count: sql<number>`count(*)::int`,
        })
        .from(content)
        .groupBy(content.type, content.status);

      const enquiryRows = await db
        .select({
          status: enquiries.status,
          count: sql<number>`count(*)::int`,
        })
        .from(enquiries)
        .groupBy(enquiries.status);

      const failedNotifications = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(enquiries)
        .where(eq(enquiries.notificationStatus, "failed"));

      const recent = await db
        .select({
          id: content.id,
          type: content.type,
          title: content.title,
          status: content.status,
          updatedAt: content.updatedAt,
        })
        .from(content)
        .orderBy(desc(content.updatedAt))
        .limit(6);

      return { contentCounts, enquiryRows, failedNotifications, recent };
    });

  const openEnquiries = enquiryRows
    .filter((row) => row.status === "new")
    .reduce((sum, row) => sum + row.count, 0);

  const countsByType: Record<string, Record<string, number>> = {};
  for (const row of contentCounts) {
    const bucket = (countsByType[row.type] ??= {});
    bucket[row.status] = row.count;
  }

  const canEditContent = hasPermission(user.role, "canEditContent");
  const canAccessEnquiries = hasPermission(user.role, "canAccessEnquiries");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Welcome back, {user.name}. Here is what needs attention.
      </p>

      {canAccessEnquiries && openEnquiries > 0 && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 px-5 py-4">
          <p className="text-sm font-semibold text-brand-900">
            {openEnquiries} new website {openEnquiries === 1 ? "enquiry is" : "enquiries are"} waiting.
          </p>
          <Link
            href="/admin/enquiries"
            className="mt-2 inline-block rounded-md bg-brand-700 px-4 py-2 text-sm font-bold text-white transition-soft hover:bg-brand-600"
          >
            Open enquiries
          </Link>
        </div>
      )}

      {canAccessEnquiries && (failedNotifications[0]?.count ?? 0) > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-900">
            Email notification failed for {failedNotifications[0]?.count ?? 0}{" "}
            {(failedNotifications[0]?.count ?? 0) === 1 ? "enquiry" : "enquiries"}. The
            enquiries are stored safely; retry the notification from the
            Enquiries page.
          </p>
        </div>
      )}

      <section className="mt-8" aria-labelledby="content-heading">
        <div className="flex items-center justify-between">
          <h2 id="content-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
            Content
          </h2>
          {canEditContent && (
            <Link
              href="/admin/services"
              className="text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
            >
              Manage content
            </Link>
          )}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(CONTENT_TYPE_LABELS) as (keyof typeof CONTENT_TYPE_LABELS)[]).map((type) => {
            const counts = countsByType[type] ?? {};
            return (
              <div key={type} className="rounded-lg border border-brand-100 bg-white p-5">
                <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                  {CONTENT_TYPE_LABELS[type]}s
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-ink-900">
                    {counts.published ?? 0}
                  </p>
                  <p className="text-sm text-ink-500">published</p>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {counts.draft ?? 0} draft, {counts.in_review ?? 0} in review
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
          Recently updated content
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-brand-100 bg-white">
          <ul className="divide-y divide-brand-100">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{row.title}</p>
                  <p className="text-xs text-ink-500">
                    {CONTENT_TYPE_LABELS[row.type]} | updated{" "}
                    {row.updatedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
            {recent.length === 0 && (
              <li className="px-5 py-6 text-sm text-ink-500">
                No content yet. Start with the Services section.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
