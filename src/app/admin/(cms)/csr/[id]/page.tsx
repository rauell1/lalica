import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default async function EditCsrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentEditorPage type="csr_story" section="csr" id={id} />;
}
