import Link from "next/link";

import { requireAdminPage } from "@/lib/auth/session";
import { listMedia } from "@/lib/media/service";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes, MediaRowActions } from "@/components/admin/media-library";
import { MediaUploadWrapper } from "@/components/admin/media-upload-wrapper";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function MediaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; upload?: string }>;
}) {
  const user = await requireAdminPage(["administrator", "editor"]);
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const q = params.q;

  const { rows, total } = await listMedia({
    actor: user,
    q,
    page,
    pageSize: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
            Media library
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} {total === 1 ? "image" : "images"}. Draft images stay hidden
            from the public site and cannot appear in published content.
          </p>
        </div>
        <Link
          href="/admin/media?upload=1"
          className="rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-600"
        >
          Upload image
        </Link>
      </div>

      {params.upload === "1" && <MediaUploadWrapper />}

      <form
        method="GET"
        action="/admin/media"
        className="mt-6 flex flex-wrap gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by alt text or storage key"
          aria-label="Search media"
          className="w-full max-w-sm rounded-md border border-brand-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500"
        />
        <button
          type="submit"
          className="rounded-md border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <figure
            key={row.id}
            className="overflow-hidden rounded-lg border border-brand-100 bg-white"
          >
            <div className="aspect-[4/3] bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${row.id}`}
                alt={row.altText}
                className="h-full w-full object-contain"
              />
            </div>
            <figcaption className="space-y-2 p-4">
              <p className="line-clamp-2 text-sm font-semibold text-ink-900">
                {row.altText}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <StatusBadge status={row.status} />
                <span>
                  {row.mimeType.replace("image/", "")} | {formatBytes(row.sizeBytes)}
                  {row.width ? ` | ${row.width}x${row.height}` : ""}
                </span>
              </div>
              <p className="text-xs font-bold text-ink-700 uppercase">
                {row.rightsStatus === "cleared"
                  ? "Rights cleared"
                  : row.rightsStatus === "illustrative"
                    ? "Illustrative image"
                    : "Rights unconfirmed"}
              </p>
              <MediaRowActions row={row} />
            </figcaption>
          </figure>
        ))}
        {rows.length === 0 && (
          <p className="col-span-full rounded-lg border border-brand-100 bg-white px-5 py-10 text-center text-sm text-ink-500">
            {q
              ? "No images match this search."
              : "No images uploaded yet. Upload the first one to use it in content."}
          </p>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center gap-2">
          {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/admin/media?page=${pageNumber}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
