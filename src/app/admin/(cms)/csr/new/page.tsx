import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default function NewCsrPage() {
  return <ContentEditorPage type="csr_story" section="csr" id={null} />;
}
