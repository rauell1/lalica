import { DraftPreviewPage } from "@/components/admin/draft-preview";

export const dynamic = "force-dynamic";

export default async function CsrPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftPreviewPage type="csr_story" section="csr" id={id} />;
}
