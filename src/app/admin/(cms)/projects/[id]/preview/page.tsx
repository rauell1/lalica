import { DraftPreviewPage } from "@/components/admin/draft-preview";

export const dynamic = "force-dynamic";

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftPreviewPage type="project" section="projects" id={id} />;
}
