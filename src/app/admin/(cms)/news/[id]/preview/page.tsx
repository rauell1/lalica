import { DraftPreviewPage } from "@/components/admin/draft-preview";

export const dynamic = "force-dynamic";

export default async function NewsPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftPreviewPage type="news" section="news" id={id} />;
}
