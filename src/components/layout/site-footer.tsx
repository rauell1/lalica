import Image from "next/image";
import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";
import { listPublishedCached } from "@/lib/content/cache";
import { MailIcon, MapPinIcon, PhoneIcon } from "@/components/public/service-icons";

export async function SiteFooter() {
  const [company, contacts, services, profileDownload, social] =
    await Promise.all([
      getSettingsCached("company")(),
      getSettingsCached("contacts")(),
      listPublishedCached("service"),
      getSettingsCached("profile_download")(),
      getSettingsCached("social")(),
    ]);

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="inline-block rounded-md bg-white p-2">
              <Image
                src="/brand/lalica-logo-white-background.jpg"
                alt={`${company.name} logo`}
                width={160}
                height={59}
                className="h-auto w-40"
              />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-brand-200">
              {company.description}
            </p>
            {profileDownload.enabled && (
              <Link
                href="/downloads/lalica-company-profile.pdf"
                className="mt-4 inline-block rounded-md border border-brand-700 px-4 py-2 text-sm font-bold text-brand-100 transition-soft hover:bg-brand-900"
              >
                Download company profile
              </Link>
            )}
          </div>

          <nav aria-label="Company">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wider text-white uppercase">
              Company
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/about" className="text-brand-200 transition-soft hover:text-white">About us</Link></li>
              <li><Link href="/services" className="text-brand-200 transition-soft hover:text-white">Services</Link></li>
              <li><Link href="/projects" className="text-brand-200 transition-soft hover:text-white">Projects</Link></li>
              <li><Link href="/csr" className="text-brand-200 transition-soft hover:text-white">CSR</Link></li>
              <li><Link href="/contact" className="text-brand-200 transition-soft hover:text-white">Contact</Link></li>
              <li><Link href="/privacy" className="text-brand-200 transition-soft hover:text-white">Privacy policy</Link></li>
            </ul>
          </nav>

          <nav aria-label="Services">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wider text-white uppercase">
              Services
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {services.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-brand-200 transition-soft hover:text-white"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wider text-white uppercase">
              Contact
            </h2>
            <address className="mt-4 space-y-3 text-sm not-italic">
              <p className="flex items-start gap-2.5 text-brand-200">
                <MapPinIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-500" />
                {contacts.addressLine}
              </p>
              <p className="flex items-center gap-2.5 text-brand-200">
                <PhoneIcon className="h-4.5 w-4.5 shrink-0 text-accent-500" />
                <a href={`tel:${contacts.telephone}`} className="transition-soft hover:text-white">
                  {contacts.telephoneDisplay}
                </a>
              </p>
              <p className="flex items-center gap-2.5 text-brand-200">
                <MailIcon className="h-4.5 w-4.5 shrink-0 text-accent-500" />
                <a href={`mailto:${contacts.email}`} className="transition-soft hover:text-white">
                  {contacts.email}
                </a>
              </p>
            </address>
            {social.published && social.entries.length > 0 && (
              <ul className="mt-4 flex gap-3">
                {social.entries.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={entry.url}
                      className="rounded-md border border-brand-700 px-3 py-1.5 text-xs font-bold text-brand-200 transition-soft hover:bg-brand-900 hover:text-white"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-brand-800 pt-6 text-xs text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {company.name}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-soft hover:text-white">
              Privacy policy
            </Link>
            <Link
              href="/admin/login"
              className="transition-soft hover:text-white"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
