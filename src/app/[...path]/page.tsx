/**
 * Catch-all for recorded redirects (for example after a published slug
 * change) and a real 404 for everything else.
 */

import { notFound, permanentRedirect } from "next/navigation";

import { getSettingsCached } from "@/lib/settings/cache";

export const dynamic = "force-dynamic";

export default async function RedirectCatcher({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const pathname = `/${path.join("/")}`;

  const redirects = await getSettingsCached("redirects")();
  const match = redirects.entries.find((entry) => entry.from === pathname);
  if (match) {
    permanentRedirect(match.to);
  }
  notFound();
}
