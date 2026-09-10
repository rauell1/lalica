import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentEditorPage type="news" section="news" id={id} />;
}
