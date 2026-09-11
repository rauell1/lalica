import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { getPublishedBySlugCached } from "@/lib/content/cache";
import { getSettingsCached } from "@/lib/settings/cache";
import { collectDraftMediaIds, type CsrMetadata } from "@/lib/content/types";
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
  const story = await getPublishedBySlugCached("csr_story", slug);
  if (!story) return { title: "CSR story not found" };
  return buildPageMetadata({
    title: { absolute: story.seoTitle || story.title },
    description: story.seoDescription || story.excerpt,
    path: `/csr/${story.slug}`,
    type: "article",
    publishedTime: story.publishedAt?.toISOString(),
  });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CsrDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getPublishedBySlugCached("csr_story", slug);
  if (!story) notFound();

  const env = getServerEnv();
  const company = await getSettingsCached("company")();
  const metadata = story.metadata as CsrMetadata;
  const body = story.body as Body;
  const galleryIds = metadata.gallery ?? [];
  const mediaMap = await resolveMediaForRender(
    null,
    collectDraftMediaIds({
      body,
      coverMediaId: story.coverMediaId,
      metadata: story.metadata,
    }),
  );

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: story.title,
          description: story.seoDescription || story.excerpt,
          url: `${env.appUrl}/csr/${story.slug}`,
          datePublished: story.publishedAt?.toISOString() ?? new Date(0).toISOString(),
          publisherName: company.name,
          publisherUrl: env.appUrl,
        })}
      />

      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "CSR", path: "/csr" },
              { name: story.title, path: `/csr/${story.slug}` },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {story.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-ink-500">
            {metadata.initiativeDate && (
              <time dateTime={metadata.initiativeDate}>
                Activity date: {formatDate(metadata.initiativeDate)}
              </time>
            )}
            {metadata.location && <span>{metadata.location}</span>}
            {metadata.theme && (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                {metadata.theme}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <article className="min-w-0">
          {story.excerpt && (
            <p className="text-lg leading-8 text-ink-600">{story.excerpt}</p>
          )}
          <div className="mt-8">
            <ContentBlocks body={body} media={mediaMap} />
          </div>

          {metadata.partners.length > 0 && (
            <section className="mt-10 rounded-xl border border-ink-100 bg-surface p-6" aria-labelledby="csr-partners">
              <h2 id="csr-partners" className="font-[family-name:var(--font-display)] text-xl font-bold text-ink-900">
                Verified partners
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Every partner below confirmed their participation before
                publication.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {metadata.partners.map((partner, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-semibold text-ink-800"
                  >
                    {partner}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {metadata.impactMeasures.length > 0 && (
            <section className="mt-10" aria-labelledby="csr-impact">
              <h2 id="csr-impact" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                Impact measures
              </h2>
              <div className="mt-5 space-y-4">
                {metadata.impactMeasures.map((measure, index) => (
                  <div key={index} className="rounded-xl border border-ink-100 bg-white p-6">
                    <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
                      {measure.label}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-700">
                      {measure.value}
                      {measure.unit && (
                        <span className="ml-1 text-base font-bold text-ink-500">
                          {measure.unit}
                        </span>
                      )}
                    </p>
                    <dl className="mt-4 space-y-2 text-sm leading-6">
                      <div>
                        <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                          Evidence
                        </dt>
                        <dd className="text-ink-700">{measure.evidence}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                          Method
                        </dt>
                        <dd className="text-ink-700">{measure.methodology}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          {metadata.sdgs.length > 0 && (
            <section className="mt-10" aria-labelledby="csr-sdgs">
              <h2 id="csr-sdgs" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                Related Sustainable Development Goals
              </h2>
              <ul className="mt-5 space-y-3">
                {metadata.sdgs.map((sdg, index) => (
                  <li key={index} className="flex items-start gap-3 rounded-lg border border-ink-100 bg-white px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-extrabold text-white">
                      {sdg.number}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">SDG {sdg.number}</p>
                      {sdg.note && (
                        <p className="text-sm leading-6 text-ink-500">{sdg.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {metadata.evidenceNotes && (
            <section className="mt-10 rounded-xl bg-surface p-6" aria-labelledby="csr-evidence">
              <h2 id="csr-evidence" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                Evidence notes
              </h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-ink-700">
                {metadata.evidenceNotes}
              </p>
            </section>
          )}

          {galleryIds.length > 0 && (
            <section className="mt-10" aria-labelledby="csr-gallery">
              <h2 id="csr-gallery" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                Gallery
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {galleryIds.map((id) => {
                  const row = mediaMap.get(id);
                  if (!row) return null;
                  return (
                    <figure key={id} className="overflow-hidden rounded-lg border border-ink-100">
                      <Image
                        src={`/api/media/${row.id}`}
                        alt={row.altText}
                        width={row.width ?? 1280}
                        height={row.height ?? 720}
                        sizes="(min-width: 640px) 400px, 100vw"
                        className="h-auto w-full"
                      />
                      {row.caption && (
                        <figcaption className="p-3 text-sm text-ink-500">
                          {row.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mt-10 border-t border-ink-100 pt-6">
            <ShareLinks title={story.title} path={`/csr/${story.slug}`} />
          </div>
        </article>
      </section>

      <CtaBanner
        title="Partner with us on a community initiative"
        body="Tell us about your initiative and how engineering skills could help."
      />
    </>
  );
}
