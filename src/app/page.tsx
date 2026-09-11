import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";
import { countPublishedCached, listPublishedCached } from "@/lib/content/cache";
import { buildPageMetadata, organizationJsonLd } from "@/lib/seo";
import { getServerEnv } from "@/lib/env";
import { JsonLd } from "@/components/public/structured-data";
import { SectionHeading } from "@/components/public/section-heading";
import { ServiceCard } from "@/components/public/service-card";
import { ArticleCard } from "@/components/public/article-card";
import { CtaBanner } from "@/components/public/cta-banner";
import {
  CheckIcon,
  MailIcon,
  PhoneIcon,
} from "@/components/public/service-icons";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const seo = await getSettingsCached("seo_defaults")();
  return buildPageMetadata({
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    path: "/",
  });
}

export default async function HomePage() {
  const env = getServerEnv();
  const [company, contacts, homepage, mission, features, partners, services] =
    await Promise.all([
      getSettingsCached("company")(),
      getSettingsCached("contacts")(),
      getSettingsCached("homepage")(),
      getSettingsCached("mission_vision")(),
      getSettingsCached("features")(),
      getSettingsCached("partners")(),
      listPublishedCached("service"),
    ]);

  const projectCount = await countPublishedCached("project");
  const csrCount = await countPublishedCached("csr_story");
  const projects = await listPublishedCached("project", 3);
  const csrStories = await listPublishedCached("csr_story", 3);

  const showPartners = partners.published && partners.entries.length > 0;

  return (
    <>
      <JsonLd
        data={organizationJsonLd({
          name: company.name,
          description: company.description,
          email: contacts.email,
          telephone: contacts.telephone,
          addressLine: contacts.addressLine,
          region: company.region,
          websiteDisplay: company.websiteDisplay,
          appUrl: env.appUrl,
        })}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div
          aria-hidden="true"
          className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-brand-800/60"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 left-[-6%] h-[420px] w-[420px] rounded-full bg-accent-500/15"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:px-8 lg:py-28">
          <div className="animate-slide-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-600 bg-brand-900/70 px-4 py-1.5 text-sm font-bold text-brand-100">
              {company.shortName} | Nairobi, Kenya
            </p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {homepage.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-100">
              {homepage.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact#enquiry-form"
                className="rounded-md bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
              >
                Request a Quote
              </Link>
              <Link
                href="/services"
                className="rounded-md border border-brand-500 bg-brand-900/40 px-6 py-3 text-sm font-bold text-white transition-soft hover:bg-brand-800"
              >
                Explore Our Services
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-brand-100">
              <a
                href={`tel:${contacts.telephone}`}
                className="inline-flex items-center gap-2 font-semibold transition-soft hover:text-white"
              >
                <PhoneIcon className="h-4.5 w-4.5 text-accent-500" />
                {contacts.telephoneDisplay}
              </a>
              <a
                href={`mailto:${contacts.email}`}
                className="inline-flex items-center gap-2 font-semibold transition-soft hover:text-white"
              >
                <MailIcon className="h-4.5 w-4.5 text-accent-500" />
                {contacts.email}
              </a>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-xl border border-brand-700 bg-brand-900/70 p-8">
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                {mission.brandStatement}
              </p>
              <p className="mt-2 text-sm text-brand-300">
                {mission.brandStatementSource}
              </p>
              <hr className="my-6 border-brand-700" />
              <dl className="space-y-5">
                <div>
                  <dt className="text-xs font-bold tracking-wider text-brand-300 uppercase">
                    Mission
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-brand-100">
                    {mission.mission}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold tracking-wider text-brand-300 uppercase">
                    Vision
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-brand-100">
                    {mission.vision}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="What we do"
            title={homepage.servicesTitle}
            subtitle={homepage.servicesSubtitle}
          />
          <Link
            href="/services"
            className="text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
          >
            View all services
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </section>

      {/* Why choose Lalica */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <SectionHeading
              eyebrow="Why choose us"
              title={homepage.whyTitle}
              subtitle={homepage.introBody}
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {company.priorities.map((priority) => (
                <li
                  key={priority}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 bg-white px-4 py-3.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-ink-800">
                    {priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Mission story panel */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="clip-corner overflow-hidden rounded-xl bg-brand-900 px-6 py-12 text-white sm:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold tracking-wider text-accent-400 uppercase">
                {homepage.storyTitle}
              </p>
              <blockquote className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
                {mission.brandStatement}
              </blockquote>
              <p className="mt-3 text-sm text-brand-300">
                {mission.brandStatementSource}
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-brand-300 uppercase">
                  Mission
                </h2>
                <p className="mt-2 leading-7 text-brand-100">{mission.mission}</p>
              </div>
              <div>
                <h2 className="text-xs font-bold tracking-wider text-brand-300 uppercase">
                  Vision
                </h2>
                <p className="mt-2 leading-7 text-brand-100">{mission.vision}</p>
              </div>
              <Link
                href="/about"
                className="inline-block rounded-md border border-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-800"
              >
                More about Lalica
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Projects panel (hidden until published projects exist) */}
      {features.homeProjects && projectCount > 0 && (
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Selected work"
                title={homepage.projectsTitle}
                subtitle="A sample of recent projects. Full details live on the project pages."
              />
              <Link
                href="/projects"
                className="text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
              >
                View all projects
              </Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ArticleCard
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  title={project.title}
                  excerpt={project.excerpt}
                  metaLabel={
                    (project.metadata as { sector?: string } | null)?.sector
                  }
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CSR panel (hidden until published stories exist) */}
      {features.homeCsr && csrCount > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Community"
              title={homepage.csrTitle}
              subtitle="Initiatives we take part in, published with evidence notes and verified partners."
            />
            <Link
              href="/csr"
              className="text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
            >
              View all CSR stories
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {csrStories.map((story) => (
              <ArticleCard
                key={story.id}
                href={`/csr/${story.slug}`}
                title={story.title}
                excerpt={story.excerpt}
                metaLabel={(story.metadata as { theme?: string } | null)?.theme}
              />
            ))}
          </div>
        </section>
      )}

      {/* Partners (unpublished until the company confirms wording and logo use) */}
      {showPartners && (
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeading
              title={homepage.partnersTitle}
              subtitle={partners.disclaimer}
              align="center"
            />
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {partners.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-ink-100 bg-white px-5 py-3 text-sm font-bold text-ink-700"
                >
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBanner title={homepage.contactTitle} body={homepage.contactBody} />
    </>
  );
}
