import Link from "next/link";

import { requireAdminPage } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { listEnquiries } from "@/lib/enquiry/service";
import type { EnquiryStatus } from "@/lib/db";
import { StatusBadge } from "@/components/ui/status-badge";
import { EnquiryRowActions } from "./enquiry-row-actions";

const PAGE_SIZE = 20;

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function EnquiryList({
  status,
  q,
  page,
}: {
  status?: string;
  q?: string;
  page: string | undefined;
}) {
  const user = await requireAdminPage(["administrator", "enquiry_manager"]);
  const env = getServerEnv();

  const { rows, total } = await listEnquiries({
    actor: user,
    status: (status as EnquiryStatus | "all" | undefined) ?? "all",
    q,
    page: parsePage(page),
    pageSize: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const query = `?${new URLSearchParams({
    status: status ?? "all",
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
            Enquiries
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} {total === 1 ? "enquiry" : "enquiries"} total.
            {env.enquiryRetentionDays > 0
              ? ` Enquiries are kept for ${env.enquiryRetentionDays} days, then deleted with the documented purge process.`
              : " Retention is unlimited until configured via ENQUIRY_RETENTION_DAYS."}
          </p>
        </div>
        <a
          href={`/api/admin/enquiries?format=csv&status=${status ?? "all"}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className="rounded-md border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Export CSV
        </a>
      </div>

      <form
        method="GET"
        action="/admin/enquiries"
        className="mt-6 flex flex-wrap gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, reference, or organisation"
          aria-label="Search enquiries"
          className="w-full max-w-md rounded-md border border-brand-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          aria-label="Filter by status"
          className="rounded-md border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink-900"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-lg border border-brand-100 bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-[family-name:var(--font-display)] text-sm font-bold text-ink-900">
                  {row.publicRef}
                </p>
                <StatusBadge status={row.status} />
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    row.notificationStatus === "sent"
                      ? "bg-green-100 text-green-800"
                      : row.notificationStatus === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-ink-300/20 text-ink-700"
                  }`}
                >
                  {row.notificationStatus === "sent"
                    ? "Email sent"
                    : row.notificationStatus === "failed"
                      ? "Email failed"
                      : row.notificationStatus === "disabled"
                        ? "Email off"
                        : "Email pending"}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {row.createdAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </p>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-ink-500 uppercase">Name</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{row.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-500 uppercase">Email</dt>
                <dd className="mt-0.5 text-ink-900">
                  <a href={`mailto:${row.email}`} className="text-brand-700 underline hover:text-brand-600">
                    {row.email}
                  </a>
                </dd>
              </div>
              {row.organisation && (
                <div>
                  <dt className="text-xs font-bold text-ink-500 uppercase">Organisation</dt>
                  <dd className="mt-0.5 text-ink-900">{row.organisation}</dd>
                </div>
              )}
              {row.telephone && (
                <div>
                  <dt className="text-xs font-bold text-ink-500 uppercase">Telephone</dt>
                  <dd className="mt-0.5 text-ink-900">{row.telephone}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold text-ink-500 uppercase">Service interest</dt>
                <dd className="mt-0.5 text-ink-900">{row.serviceInterest || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-500 uppercase">
                  Privacy policy accepted
                </dt>
                <dd className="mt-0.5 text-ink-900">Version {row.privacyVersion}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-md bg-surface p-4">
              <p className="text-xs font-bold text-ink-500 uppercase">Message</p>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-ink-900">
                {row.message}
              </p>
            </div>

            <div className="mt-4">
              <EnquiryRowActions row={row} currentUserId={user.id} />
            </div>
          </article>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-brand-100 bg-white px-5 py-12 text-center text-sm text-ink-500">
            No enquiries match this view.
          </p>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center gap-2">
          {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/admin/enquiries?page=${pageNumber}&status=${status ?? "all"}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={parsePage(page) === pageNumber ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-bold ${
                parsePage(page) === pageNumber
                  ? "bg-brand-700 text-white"
                  : "border border-brand-200 text-brand-800 hover:bg-brand-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </nav>
      )}

      <p className="mt-8 text-xs leading-5 text-ink-500">
        The CSV export is neutralised against spreadsheet formula injection
        and every export is written to the audit log. The {query} filter is
        kept for the exported file.
      </p>
    </div>
  );
}
