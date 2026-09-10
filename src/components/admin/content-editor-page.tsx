import { requireAdminPage } from "@/lib/auth/session";
import { getContentForAdmin } from "@/lib/content/service";
import { parseDraft } from "@/lib/content/types";
import { listMedia } from "@/lib/media/service";
import { hasPermission } from "@/lib/auth/roles";
import type { ContentType } from "@/lib/db";
import { ContentEditor, type MediaOption } from "./content-editor";

export async function ContentEditorPage({
  type,
  section,
  id,
}: {
  type: ContentType;
  section: string;
  id: string | null;
}) {
  const user = await requireAdminPage(["administrator", "editor"]);

  let initialDraft: unknown = null;
  let version = 0;
  let status = "draft";
  if (id) {
    const row = await getContentForAdmin(user, id);
    initialDraft = parseDraft(row.type, row.draft);
    version = row.version;
    status = row.status;
  }

  const media = await listMedia({ actor: user, page: 1, pageSize: 200 });
  const mediaOptions: MediaOption[] = media.rows.map((row) => ({
    id: row.id,
    altText: row.altText,
    status: row.status,
  }));

  return (
    <ContentEditor
      type={type}
      contentId={id}
      version={version}
      status={status}
      initialDraft={initialDraft}
      mediaOptions={mediaOptions}
      canPublish={hasPermission(user.role, "canPublish")}
      backHref={`/admin/${section}`}
    />
  );
}
