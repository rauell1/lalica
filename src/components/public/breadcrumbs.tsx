import Link from "next/link";

import { JsonLd } from "./structured-data";
import { breadcrumbsJsonLd } from "@/lib/seo";

export function Breadcrumbs({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <JsonLd data={breadcrumbsJsonLd(items)} />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-ink-300">
                  /
                </span>
              )}
              {last ? (
                <span aria-current="page" className="font-semibold text-ink-700">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="font-semibold transition-soft hover:text-brand-700"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
