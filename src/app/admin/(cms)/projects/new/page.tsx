import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return <ContentEditorPage type="project" section="projects" id={null} />;
}
