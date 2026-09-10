import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentEditorPage type="project" section="projects" id={id} />;
}
