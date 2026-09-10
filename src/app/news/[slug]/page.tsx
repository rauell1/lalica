import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedBySlugCached } from "@/lib/content/cache";
import { getSettingsCached } from "@/lib/settings/cache";
import { collectDraftMediaIds } from "@/lib/content/types";
import type { Body } from "@/lib/content/blocks";
import { resolveMediaForRender } from "@/lib/media/service";
import { articleJsonLd, buildPageMetadata } from "@/lib/seo";
import { getServerEnv } from "@/lib/env";
import { JsonLd } from "@/components/public/structured-data";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ContentBlocks } from "@/components/public/content-blocks";
import { ShareLinks } from "@/components/public/share-links";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedBySlugCached("news", slug);
  if (!article) return { title: "Article not found" };
  return buildPageMetadata({
    title: { absolute: article.seoTitle || article.title },
    description: article.seoDescription || article.excerpt,
    path: `/news/${article.slug}`,
    type: "article",
    publishedTime: article.publishedAt?.toISOString(),
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedBySlugCached("news", slug);
  if (!article) notFound();

  const env = getServerEnv();
  const company = await getSettingsCached("company")();
  const body = article.body as Body;
  const category = (article.metadata as { category?: string } | null)?.category;
  const mediaMap = await resolveMediaForRender(
    null,
    collectDraftMediaIds({
      body,
      coverMediaId: article.coverMediaId,
      metadata: article.metadata,
    }),
  );

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: article.title,
          description: article.seoDescription || article.excerpt,
          url: `${env.appUrl}/news/${article.slug}`,
          datePublished:
            article.publishedAt?.toISOString() ?? new Date(0).toISOString(),
          publisherName: company.name,
          publisherUrl: env.appUrl,
        })}
      />

      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "News", path: "/news" },
              { name: article.title, path: `/news/${article.slug}` },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink-500">
            {article.publishedAt && (
              <time dateTime={article.publishedAt.toISOString()}>
                {article.publishedAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
            )}
            {category && (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                {category}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <article className="min-w-0">
          {article.excerpt && (
            <p className="text-lg leading-8 text-ink-600">{article.excerpt}</p>
          )}
          <div className="mt-8">
            <ContentBlocks body={body} media={mediaMap} />
          </div>
          <div className="mt-10 border-t border-ink-100 pt-6">
            <ShareLinks title={article.title} path={`/news/${article.slug}`} />
          </div>
        </article>
      </section>

      <CtaBanner
        title="Talk to our team"
        body="Tell us about your facility, plant, or project. We will get back to you to discuss the best way forward."
      />
    </>
  );
}
