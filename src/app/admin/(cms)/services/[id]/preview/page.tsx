import { DraftPreviewPage } from "@/components/admin/draft-preview";

export const dynamic = "force-dynamic";

export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftPreviewPage type="service" section="services" id={id} />;
}
