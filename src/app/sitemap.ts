import type { MetadataRoute } from "next";

import { listPublishedCached, countPublishedCached } from "@/lib/content/cache";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Sitemap with only substantive published pages. Drafts, previews, admin
 * pages, and empty collection indexes are excluded. Unpublished content is
 * additionally protected by server side access control, so exclusion here
 * is about search engines, not security.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getServerEnv();

  const [services, projects, csrStories, news, projectCount, csrCount, newsCount] =
    await Promise.all([
      listPublishedCached("service"),
      listPublishedCached("project"),
      listPublishedCached("csr_story"),
      listPublishedCached("news"),
      countPublishedCached("project"),
      countPublishedCached("csr_story"),
      countPublishedCached("news"),
    ]);

  const staticEntries = ["", "/about", "/services", "/contact", "/privacy"].map(
    (path) => ({
      url: `${env.appUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const contentEntries: MetadataRoute.Sitemap = [];
  const addSection = (
    base: string,
    rows: { slug: string; publishedAt: Date | null }[],
    count: number,
    priority: number,
  ) => {
    if (count === 0) return;
    contentEntries.push({
      url: `${env.appUrl}${base}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority,
    });
    for (const row of rows) {
      contentEntries.push({
        url: `${env.appUrl}${base}/${row.slug}`,
        lastModified: row.publishedAt ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  };

  addSection("/projects", projects, projectCount, 0.8);
  addSection("/csr", csrStories, csrCount, 0.8);
  addSection("/news", news, newsCount, 0.8);
  addSection("/services", services, services.length, 0.8);

  return [...staticEntries, ...contentEntries];
}
