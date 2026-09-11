import Link from "next/link";

import { requireAdminPage } from "@/lib/auth/session";
import { listContentForAdmin, type ContentRow } from "@/lib/content/service";
import { CONTENT_TYPE_LABELS } from "@/lib/content/types";
import type { ContentType, ContentStatus } from "@/lib/db";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission } from "@/lib/auth/roles";
import { ContentRowActions } from "./content-row-actions";

const PAGE_SIZE = 20;

export async function ContentList({
  type,
  q,
  status,
  page,
}: {
  type: ContentType;
  q?: string;
  status?: string;
  page: number;
}) {
  const user = await requireAdminPage(["administrator", "editor"]);
  const { rows, total } = await listContentForAdmin({
    actor: user,
    type,
    q,
    status: (status as ContentStatus | "all" | undefined) ?? "all",
    page,
    pageSize: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const label = CONTENT_TYPE_LABELS[type];
  const canPublish = hasPermission(user.role, "canPublish");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
            {label}s
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} {total === 1 ? "item" : "items"} total.{" "}
            {!canPublish && "Editors can save drafts and submit them for review."}
          </p>
        </div>
        <Link
          href={`/admin/${type === "csr_story" ? "csr" : type === "news" ? "news" : `${type}s`}/new`}
          className="rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-600"
        >
          New {label.toLowerCase()}
        </Link>
      </div>

      <form
        method="GET"
        action={`/admin/${type === "csr_story" ? "csr" : type === "news" ? "news" : `${type}s`}`}
        className="mt-6 flex flex-wrap gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={`Search ${label.toLowerCase()}s by title or slug`}
          aria-label="Search"
          className="w-full max-w-sm rounded-md border border-brand-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          aria-label="Filter by status"
          className="rounded-md border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink-900"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_review">In review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-brand-100 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-xs tracking-wider text-ink-500 uppercase">
              <th scope="col" className="px-5 py-3">Title</th>
              <th scope="col" className="px-5 py-3">Slug</th>
              <th scope="col" className="px-5 py-3">Status</th>
              <th scope="col" className="px-5 py-3">Updated</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((row: ContentRow) => (
              <tr key={row.id} className="align-top">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/${type === "csr_story" ? "csr" : type === "news" ? "news" : `${type}s`}/${row.id}`}
                    className="font-semibold text-ink-900 transition-soft hover:text-brand-700"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-500">{row.slug}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {row.updatedAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="px-5 py-3 text-right">
                  <ContentRowActions row={row} canPublish={canPublish} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-500">
                  No {label.toLowerCase()}s match this view yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center gap-2">
          {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/admin/${type === "csr_story" ? "csr" : type === "news" ? "news" : `${type}s`}?page=${pageNumber}${q ? `&q=${encodeURIComponent(q)}` : ""}${status && status !== "all" ? `&status=${status}` : ""}`}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-bold ${
                pageNumber === page
                  ? "bg-brand-700 text-white"
                  : "border border-brand-200 text-brand-800 hover:bg-brand-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
