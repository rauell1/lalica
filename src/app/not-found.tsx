import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start px-4 py-24 text-center sm:items-center sm:px-6">
      <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold text-accent-500">
        404
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-ink-900">
        This page could not be found
      </h1>
      <p className="mt-4 max-w-xl leading-7 text-ink-500">
        The page you are looking for may have moved, or it may never have been
        published. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-md bg-brand-700 px-6 py-3 text-sm font-bold text-white transition-soft hover:bg-brand-600"
        >
          Go to the homepage
        </Link>
        <Link
          href="/services"
          className="rounded-md border border-brand-200 px-6 py-3 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Explore our services
        </Link>
        <Link
          href="/contact"
          className="rounded-md border border-brand-200 px-6 py-3 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
        >
          Contact us
        </Link>
      </div>
    </section>
  );
}
