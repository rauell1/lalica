import Link from "next/link";

export function EmptyCollection({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-surface px-6 py-14 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl leading-7 text-ink-500">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/contact#enquiry-form"
          className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-600"
        >
          Contact us
        </Link>
        <Link
          href="/services"
          className="rounded-md border border-ink-200 px-5 py-2.5 text-sm font-bold text-ink-800 transition-soft hover:bg-white"
        >
          Explore our services
        </Link>
      </div>
    </div>
  );
}
