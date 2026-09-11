import Link from "next/link";
import Image from "next/image";

import { ArrowRightIcon, BoltIcon, GearIcon, SnowflakeIcon } from "./service-icons";

export interface ServiceCardData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverMediaId: string | null;
  metadata: { serviceGroup?: string } | null;
  coverMedia?: { id: string; width: number | null; height: number | null } | null;
}

export function ServiceCard({ service }: { service: ServiceCardData }) {
  const Icon =
    service.metadata?.serviceGroup === "mechanical"
      ? GearIcon
      : service.metadata?.serviceGroup === "refrigeration_hvac"
        ? SnowflakeIcon
        : BoltIcon;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card transition-soft hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-50 to-surface">
        {service.coverMedia ? (
          <Image
            src={`/api/media/${service.coverMedia.id}`}
            alt=""
            width={service.coverMedia.width ?? 640}
            height={service.coverMedia.height ?? 360}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-16 w-16 text-brand-700" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink-900">
          <Link href={`/services/${service.slug}`} className="transition-soft group-hover:text-brand-700">
            {service.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-ink-500">
          {service.excerpt}
        </p>
        <Link
          href={`/services/${service.slug}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition-soft hover:text-brand-600"
          aria-label={`Read more about ${service.title}`}
        >
          Read more
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
