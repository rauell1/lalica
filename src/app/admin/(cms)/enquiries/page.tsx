import { EnquiryList } from "@/components/admin/enquiry-list";

export const dynamic = "force-dynamic";

export default function EnquiriesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  return <EnquiryListPage searchParams={searchParams} />;
}

async function EnquiryListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <EnquiryList status={params.status} q={params.q} page={params.page} />;
}
