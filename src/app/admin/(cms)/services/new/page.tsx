import { ContentEditorPage } from "@/components/admin/content-editor-page";

export const dynamic = "force-dynamic";

export default function NewServicePage() {
  return <ContentEditorPage type="service" section="services" id={null} />;
}
