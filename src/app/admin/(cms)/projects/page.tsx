import { ContentAdminPage } from "@/components/admin/content-admin-page";

export const dynamic = "force-dynamic";

export default function ProjectsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  return <ContentAdminPage type="project" searchParams={searchParams} />;
}
