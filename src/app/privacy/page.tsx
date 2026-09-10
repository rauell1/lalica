import type { Metadata } from "next";
import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";
import { Breadcrumbs } from "@/components/public/breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Privacy policy",
    description:
      "How Lalica Engineering Limited collects and uses information through this website.",
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const privacy = await getSettingsCached("privacy")();
  const published = privacy.publishedSections;
  const sections = published ?? privacy.draft.sections;

  return (
    <>
      <section className="border-b border-brand-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Privacy policy", path: "/privacy" }]} />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Privacy policy
          </h1>
          {privacy.publishedAt && (
            <p className="mt-3 text-sm font-semibold text-ink-500">
              Version {privacy.version}, last updated{" "}
              {new Date(privacy.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {!published && (
          <p className="mb-8 rounded-md border border-accent-500 bg-accent-50 px-5 py-4 text-sm leading-6 text-ink-700">
            This policy is a draft currently under review by the site owner.
            It was prepared to match the data this website actually collects
            and the processors it uses.
          </p>
        )}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`privacy-${section.id}`}>
              <h2
                id={`privacy-${section.id}`}
                className="font-[family-name:var(--font-display)] text-xl font-bold text-ink-900"
              >
                {section.heading}
              </h2>
              <p className="mt-3 leading-7 text-ink-700">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 rounded-md bg-surface px-5 py-4 text-sm leading-6 text-ink-500">
          Questions about this policy? Write to{" "}
          <Link href="/contact" className="font-semibold text-brand-700 underline transition-soft hover:text-brand-600">
            our team
          </Link>{" "}
          or email info@lalicaengineering.com.
        </p>
      </section>
    </>
  );
}
