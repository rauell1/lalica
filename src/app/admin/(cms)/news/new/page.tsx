import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default function NewNewsPage() {
  return <ContentEditorPage type="news" section="news" id={null} />;
}
