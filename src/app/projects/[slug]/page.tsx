import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { getPublishedBySlugCached } from "@/lib/content/cache";
import { collectDraftMediaIds, type ProjectMetadata } from "@/lib/content/types";
import type { Body } from "@/lib/content/blocks";
import { resolveMediaForRender } from "@/lib/media/service";
import { buildPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/public/structured-data";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ContentBlocks } from "@/components/public/content-blocks";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedBySlugCached("project", slug);
  if (!project) return { title: "Project not found" };
  return buildPageMetadata({
    title: { absolute: project.seoTitle || project.title },
    description: project.seoDescription || project.excerpt,
    path: `/projects/${project.slug}`,
  });
}

function formatMonth(value: string | undefined): string | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublishedBySlugCached("project", slug);
  if (!project) notFound();

  const metadata = project.metadata as ProjectMetadata;
  const body = project.body as Body;
  const galleryIds = metadata.gallery ?? [];
  const mediaMap = await resolveMediaForRender(
    null,
    collectDraftMediaIds({
      body,
      coverMediaId: project.coverMediaId,
      metadata: project.metadata,
    }),
  );

  const timelineLabel = [formatMonth(metadata.startDate), formatMonth(metadata.endDate)]
    .filter(Boolean)
    .join(" to ");

  const clientLabel =
    metadata.clientDisplay === "named"
      ? metadata.clientName
      : metadata.clientDisplay === "anonymous"
        ? "Client name withheld"
        : null;

  return (
    <>
      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Projects", path: "/projects" },
              { name: project.title, path: `/projects/${project.slug}` },
            ]}
          />
          <h1 className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {project.title}
          </h1>
          {project.excerpt && (
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
              {project.excerpt}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <article className="min-w-0">
            <ContentBlocks body={body} media={mediaMap} />

            {metadata.challenge && (
              <section className="mt-10" aria-labelledby="project-challenge">
                <h2 id="project-challenge" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                  The challenge
                </h2>
                <p className="mt-3 leading-7 whitespace-pre-wrap text-ink-700">
                  {metadata.challenge}
                </p>
              </section>
            )}

            {metadata.solution && (
              <section className="mt-8" aria-labelledby="project-solution">
                <h2 id="project-solution" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                  What we did
                </h2>
                <p className="mt-3 leading-7 whitespace-pre-wrap text-ink-700">
                  {metadata.solution}
                </p>
              </section>
            )}

            {metadata.outcomes.length > 0 && (
              <section className="mt-8" aria-labelledby="project-outcomes">
                <h2 id="project-outcomes" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                  Outcomes
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-ink-700">
                  {metadata.outcomes.map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                </ul>
              </section>
            )}

            {galleryIds.length > 0 && (
              <section className="mt-10" aria-labelledby="project-gallery">
                <h2 id="project-gallery" className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink-900">
                  Project gallery
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
                          sizes="(min-width: 1024px) 400px, 100vw"
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
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-ink-100 bg-surface p-6">
              <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                Project details
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                {metadata.sector && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                      Sector
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">
                      {metadata.sector}
                    </dd>
                  </div>
                )}
                {metadata.location && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                      Location
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">
                      {metadata.location}
                    </dd>
                  </div>
                )}
                {clientLabel && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                      Client
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">
                      {clientLabel}
                    </dd>
                  </div>
                )}
                {timelineLabel && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                      Timeline
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">
                      {timelineLabel}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">
                    Status
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink-800">
                    {metadata.status === "ongoing" ? "Ongoing" : "Completed"}
                  </dd>
                </div>
              </dl>
            </div>

            {metadata.relatedServices.length > 0 && (
              <div className="rounded-xl border border-ink-100 bg-surface p-6">
                <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                  Related services
                </h2>
                <ul className="mt-3 space-y-1 text-sm">
                  {metadata.relatedServices.map((name) => (
                    <li key={name}>
                      <Link
                        href={`/contact?service=${encodeURIComponent(name)}#enquiry-form`}
                        className="font-semibold text-ink-700 transition-soft hover:text-brand-700"
                      >
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="clip-corner bg-brand-900 p-6 text-white">
              <h2 className="font-[family-name:var(--font-display)] text-base font-bold">
                Similar requirement?
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-200">
                Tell us about your project and we will scope it with you
                before quoting.
              </p>
              <Link
                href="/contact#enquiry-form"
                className="mt-4 inline-block rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
              >
                Request a Quote
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <CtaBanner
        title="Start your project with Lalica"
        body="We scope each job with you before quoting, so you know exactly what you are getting."
      />
    </>
  );
}
