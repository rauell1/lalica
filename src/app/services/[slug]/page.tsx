import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  getPublishedBySlugCached,
  listPublishedCached,
} from "@/lib/content/cache";
import { getSettingsCached } from "@/lib/settings/cache";
import { collectDraftMediaIds } from "@/lib/content/types";
import type { Body } from "@/lib/content/blocks";
import { resolveMediaForRender } from "@/lib/media/service";
import { buildPageMetadata, serviceJsonLd } from "@/lib/seo";
import { getServerEnv } from "@/lib/env";
import { JsonLd } from "@/components/public/structured-data";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ContentBlocks } from "@/components/public/content-blocks";
import { CtaBanner } from "@/components/public/cta-banner";
import { ArrowRightIcon } from "@/components/public/service-icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublishedBySlugCached("service", slug);
  if (!service) return { title: "Service not found" };
  return buildPageMetadata({
    title: { absolute: service.seoTitle || service.title },
    description: service.seoDescription || service.excerpt,
    path: `/services/${service.slug}`,
  });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getPublishedBySlugCached("service", slug);
  if (!service) notFound();

  const env = getServerEnv();
  const [company, allServices] = await Promise.all([
    getSettingsCached("company")(),
    listPublishedCached("service"),
  ]);

  const body = service.body as Body;
  const mediaMap = await resolveMediaForRender(
    null,
    collectDraftMediaIds({
      body,
      coverMediaId: service.coverMediaId,
      metadata: service.metadata,
    }),
  );

  const others = allServices.filter((item) => item.slug !== service.slug);
  const title = service.seoTitle || service.title;

  return (
    <>
      <JsonLd
        data={serviceJsonLd({
          name: service.title,
          description: service.seoDescription || service.excerpt,
          url: `${env.appUrl}/services/${service.slug}`,
          providerName: company.name,
          providerUrl: env.appUrl,
          areaServed: company.region,
        })}
      />

      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: service.title, path: `/services/${service.slug}` },
            ]}
          />
          <h1 className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {title}
          </h1>
          {service.excerpt && (
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
              {service.excerpt}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <article className="min-w-0">
            <ContentBlocks body={body} media={mediaMap} />
          </article>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {others.length > 0 && (
              <div className="rounded-xl border border-ink-100 bg-surface p-6">
                <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                  Other services
                </h2>
                <ul className="mt-4 space-y-1">
                  {others.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/services/${item.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-ink-700 transition-soft hover:bg-white hover:text-brand-700"
                      >
                        {item.title}
                        <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="clip-corner bg-brand-900 p-6 text-white">
              <h2 className="font-[family-name:var(--font-display)] text-base font-bold">
                Need this service?
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-200">
                Send an enquiry and mention this service. We will get back to
                you to discuss your requirements.
              </p>
              <Link
                href={`/contact?service=${encodeURIComponent(service.title)}#enquiry-form`}
                className="mt-4 inline-block rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
              >
                Request a Quote
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <CtaBanner
        title="Talk to us about your requirements"
        body="We scope each job with you before quoting, so you know exactly what you are getting."
      />
    </>
  );
}
