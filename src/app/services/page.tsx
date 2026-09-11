import Link from "next/link";

import { listPublishedCached } from "@/lib/content/cache";
import { getSettingsCached } from "@/lib/settings/cache";
import { buildPageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ServiceCard } from "@/components/public/service-card";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const homepage = await getSettingsCached("homepage")();
  return buildPageMetadata({
    title: "Services",
    description: homepage.servicesSubtitle,
    path: "/services",
  });
}

export default async function ServicesPage() {
  const [services, homepage] = await Promise.all([
    listPublishedCached("service"),
    getSettingsCached("homepage")(),
  ]);

  return (
    <>
      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {homepage.servicesTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            {homepage.servicesSubtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={{
                id: service.id,
                slug: service.slug,
                title: service.title,
                excerpt: service.excerpt,
                coverMediaId: service.coverMediaId,
                metadata: service.metadata as { serviceGroup?: string } | null,
                coverMedia: null,
              }}
            />
          ))}
        </div>
        {services.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 bg-surface px-6 py-14 text-center text-ink-500">
            Services are being prepared and will appear here shortly.
          </p>
        )}
      </section>

      <CtaBanner
        title="Not sure which service fits?"
        body="Describe your requirement and we will point you to the right service group."
      />
    </>
  );
}
