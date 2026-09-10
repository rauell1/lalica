import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";
import { buildPageMetadata, breadcrumbsJsonLd, organizationJsonLd } from "@/lib/seo";
import { getServerEnv } from "@/lib/env";
import { JsonLd } from "@/components/public/structured-data";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { SectionHeading } from "@/components/public/section-heading";
import { CtaBanner } from "@/components/public/cta-banner";
import { CheckIcon } from "@/components/public/service-icons";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const company = await getSettingsCached("company")();
  return buildPageMetadata({
    title: "About",
    description:
      "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients. Based in Kahawa West, Nairobi.",
    path: "/about",
  });
}

export default async function AboutPage() {
  const env = getServerEnv();
  const [company, mission, contacts] = await Promise.all([
    getSettingsCached("company")(),
    getSettingsCached("mission_vision")(),
    getSettingsCached("contacts")(),
  ]);

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

      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "About", path: "/about" },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            About {company.shortName}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            {mission.brandStatement}. {mission.brandStatementSource}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-10">
            <div>
              <SectionHeading eyebrow="Who we are" title={company.shortName} />
              <p className="mt-4 leading-7 text-ink-700">{company.description}</p>
            </div>

            <div>
              <SectionHeading eyebrow="How we work" title="Priorities we commit to" />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
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

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
                  Our mission
                </h2>
                <p className="mt-3 leading-7 text-ink-700">{mission.mission}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
                  Our vision
                </h2>
                <p className="mt-3 leading-7 text-ink-700">{mission.vision}</p>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-ink-100 bg-surface p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
                Where to find us
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-700">
                {contacts.addressLine}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-700">
                <a
                  href={`tel:${contacts.telephone}`}
                  className="font-bold text-brand-700 transition-soft hover:text-brand-600"
                >
                  {contacts.telephoneDisplay}
                </a>
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                <a
                  href={`mailto:${contacts.email}`}
                  className="font-bold text-brand-700 transition-soft hover:text-brand-600"
                >
                  {contacts.email}
                </a>
              </p>
              {contacts.locationSearchUrl && (
                <Link
                  href={contacts.locationSearchUrl}
                  className="mt-4 inline-block rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800 transition-soft hover:border-ink-300"
                >
                  Find us on a map
                </Link>
              )}
            </div>
            <div className="rounded-xl bg-brand-900 p-6 text-white">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Explore what we do
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-200">
                Three service groups cover electrical and automation
                engineering, mechanical engineering, and refrigeration and
                HVAC solutions.
              </p>
              <Link
                href="/services"
                className="mt-4 inline-block rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
              >
                View our services
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <CtaBanner
        title="Talk to our team"
        body="Tell us about your facility, plant, or project. We will get back to you to discuss the best way forward."
      />
    </>
  );
}
