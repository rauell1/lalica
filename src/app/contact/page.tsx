import type { Metadata } from "next";
import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";
import { listPublishedCached } from "@/lib/content/cache";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { JsonLd } from "@/components/public/structured-data";
import { organizationJsonLd } from "@/lib/seo";
import { getServerEnv } from "@/lib/env";
import { MailIcon, MapPinIcon, PhoneIcon } from "@/components/public/service-icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact",
    description:
      "Contact Lalica Engineering Limited: DSM Center, Kahawa West, Nairobi, Kenya. Telephone +254 728 112 444, email info@lalicaengineering.com.",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const query = await searchParams;
  const [company, contacts, services, profileDownload] = await Promise.all([
    getSettingsCached("company")(),
    getSettingsCached("contacts")(),
    listPublishedCached("service"),
    getSettingsCached("profile_download")(),
  ]);
  const env = getServerEnv();

  return (
    <>
      <JsonLd
        data={organizationJsonLd({
          name: company.name,
          description: company.description,
          addressLine: company.addressLine,
          region: company.region,
          email: company.email,
          telephone: company.telephone,
          websiteDisplay: company.websiteDisplay,
          appUrl: env.appUrl,
        })}
      />

      <section className="border-b border-brand-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]} />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Contact {company.shortName}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            Send an enquiry, call us, or write to us. We are based at DSM
            Center, Kahawa West, Nairobi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-brand-100 bg-surface p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink-900">
                Contact details
              </h2>
              <address className="mt-4 space-y-4 text-sm not-italic">
                <p className="flex items-start gap-3 leading-6 text-ink-700">
                  <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  {company.addressLine}
                </p>
                <p className="flex items-center gap-3 text-ink-700">
                  <PhoneIcon className="h-5 w-5 shrink-0 text-brand-700" />
                  <a href={`tel:${contacts.telephone.replace(/\s/g, "")}`} className="transition-soft hover:text-brand-700">
                    {contacts.telephoneDisplay}
                  </a>
                </p>
                <p className="flex items-center gap-3 text-ink-700">
                  <MailIcon className="h-5 w-5 shrink-0 text-brand-700" />
                  <a href={`mailto:${contacts.email}`} className="transition-soft hover:text-brand-700">
                    {contacts.email}
                  </a>
                </p>
              </address>
            </div>

            {company.locationSearchUrl && (
              <Link
                href={company.locationSearchUrl}
                className="block rounded-lg border border-brand-100 p-6 transition-soft hover:border-brand-300 hover:shadow-sm"
              >
                <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                  Find our office
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Open a location search for {company.addressLine}. Exact map
                  coordinates will be published once they are confirmed.
                </p>
              </Link>
            )}

            {profileDownload.enabled && (
              <div className="rounded-lg border border-brand-100 p-6">
                <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                  Company profile
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Download the Lalica company profile ({profileDownload.sizeLabel}).
                </p>
                <Link
                  href="/downloads/lalica-company-profile.pdf"
                  className="mt-3 inline-block rounded-md bg-brand-700 px-4 py-2 text-sm font-bold text-white transition-soft hover:bg-brand-600"
                >
                  Download PDF
                </Link>
              </div>
            )}

            {contacts.businessHours && (
              <div className="rounded-lg border border-brand-100 p-6">
                <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
                  Business hours
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  {contacts.businessHours}
                </p>
              </div>
            )}
          </div>

          <div id="enquiry-form" className="scroll-mt-24 rounded-lg border border-brand-100 bg-white p-6 sm:p-8">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
              Send us an enquiry
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Fields marked with an asterisk are required. We normally respond
              within one or two working days.
            </p>
            <div className="mt-7">
              <EnquiryForm
                serviceOptions={services.map((service) => service.title)}
                preselectedService={query.service}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
