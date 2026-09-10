import Link from "next/link";

import { requireAdminPage } from "@/lib/auth/session";
import { getContentForAdmin, type ContentRow } from "@/lib/content/service";
import { parseDraft, collectDraftMediaIds, CONTENT_TYPE_LABELS } from "@/lib/content/types";
import type { ContentType } from "@/lib/db";
import type { Body } from "@/lib/content/blocks";
import { resolveMediaForRender } from "@/lib/media/service";
import { ContentBlocks } from "@/components/public/content-blocks";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";

export async function DraftPreviewPage({
  type,
  section,
  id,
}: {
  type: ContentType;
  section: string;
  id: string;
}) {
  const user = await requireAdminPage(["administrator", "editor"]);
  const row: ContentRow = await getContentForAdmin(user, id);
  const draft = parseDraft(row.type, row.draft);

  const mediaMap = await resolveMediaForRender(
    user,
    collectDraftMediaIds({
      body: draft.body,
      coverMediaId: draft.coverMediaId,
      metadata: draft.metadata,
    }),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-500 bg-accent-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={row.status} />
          <p className="text-sm font-bold text-ink-800">
            Draft preview for staff only. Never visible on the public site.
          </p>
        </div>
        <Link
          href={`/admin/${section}/${id}`}
          className="rounded-md bg-brand-700 px-3.5 py-2 text-sm font-bold text-white transition-soft hover:bg-brand-600"
        >
          Back to editor
        </Link>
      </div>

      <div className="mt-6 border-b border-brand-100 bg-surface pb-8">
        <Breadcrumbs
          items={[
            { name: "Admin", path: "/admin" },
            { name: CONTENT_TYPE_LABELS[type], path: `/admin/${section}` },
            { name: "Preview", path: "" },
          ]}
        />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900">
          {draft.title || "Untitled draft"}
        </h1>
        {draft.excerpt && (
          <p className="mt-3 max-w-3xl text-lg leading-8 text-ink-500">{draft.excerpt}</p>
        )}
      </div>

      <div className="py-10">
        <ContentBlocks body={draft.body as Body} media={mediaMap} />
      </div>

      <details className="mb-10 rounded-lg border border-brand-100 bg-surface p-5">
        <summary className="cursor-pointer text-sm font-bold text-ink-800">
          Metadata for this {CONTENT_TYPE_LABELS[type].toLowerCase()}
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-brand-950 p-4 text-xs leading-5 text-brand-100">
          {JSON.stringify(draft.metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}
