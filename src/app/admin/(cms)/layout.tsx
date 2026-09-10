import { requireAdminPage } from "@/lib/auth/session";
import { ROLES } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPage([...ROLES]);
  return <AdminShell user={user}>{children}</AdminShell>;
}
