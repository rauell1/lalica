import { ContentList } from "@/components/admin/content-list";
import type { ContentType } from "@/lib/db";

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function ContentAdminPage({
  type,
  searchParams,
}: {
  type: ContentType;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  return (
    <ContentList
      type={type}
      q={params.q}
      status={params.status}
      page={parsePage(params.page)}
    />
  );
}
