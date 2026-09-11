import Link from "next/link";

export function ArticleCard({
  href,
  title,
  excerpt,
  dateLabel,
  metaLabel,
}: {
  href: string;
  title: string;
  excerpt: string;
  dateLabel?: string;
  metaLabel?: string;
}) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-ink-100 bg-white p-6 shadow-card transition-soft hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink-500 uppercase">
        {dateLabel && (
          <time dateTime={dateLabel} className="text-accent-600">
            {dateLabel}
          </time>
        )}
        {metaLabel && <span>{metaLabel}</span>}
      </div>
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-bold text-ink-900">
        <Link href={href} className="transition-soft group-hover:text-brand-700">
          {title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-ink-500">{excerpt}</p>
      <Link
        href={href}
        className="mt-4 text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
        aria-label={`Read more: ${title}`}
      >
        Read more
      </Link>
    </article>
  );
}
