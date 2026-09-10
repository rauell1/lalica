import Link from "next/link";

import { getSettingsCached } from "@/lib/settings/cache";

export async function CtaBanner({
  title,
  body,
  buttonLabel = "Request a Quote",
}: {
  title: string;
  body: string;
  buttonLabel?: string;
}) {
  const company = await getSettingsCached("company")();
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="clip-corner relative overflow-hidden rounded-xl bg-brand-900 px-6 py-12 text-white sm:px-12">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-700/40"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent-500/20"
        />
        <div className="relative max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-lg leading-8 text-brand-100">{body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/contact#enquiry-form"
              className="rounded-md bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
            >
              {buttonLabel}
            </Link>
            <Link
              href="/services"
              className="rounded-md border border-brand-500 px-6 py-3 text-sm font-bold text-white transition-soft hover:bg-brand-800"
            >
              Explore Our Services
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
