import { ContentAdminPage } from "@/components/admin/content-admin-page";

export const dynamic = "force-dynamic";

export default function ServicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  return <ContentAdminPage type="service" searchParams={searchParams} />;
}
