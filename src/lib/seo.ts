/**
 * SEO helpers: page metadata with configurable origin, JSON-LD builders,
 * and structured data restricted to verified facts.
 *
 * The company profile confirms the name, address, telephone, and email.
 * JSON-LD deliberately excludes ratings, opening hours, coordinates,
 * credentials, and social URLs because none of those are verified.
 */

import type { Metadata } from "next";

import { getServerEnv } from "./env";

interface PageMetaInput {
  title: string | { absolute: string };
  description: string;
  path: string;
  type?: "website" | "article";
  noIndex?: boolean;
  publishedTime?: string;
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const env = getServerEnv();
  const canonicalPath =
    input.path === "/" ? "/" : input.path.replace(/\/+$/, "");
  const url = `${env.appUrl}${canonicalPath}`;
  return {
    metadataBase: new URL(env.appUrl),
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: "Lalica Engineering Limited",
      type: input.type ?? "website",
      locale: "en_KE",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Lalica Engineering Limited",
        },
      ],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    robots: input.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export interface OrganizationLd {
  name: string;
  description: string;
  email: string;
  telephone: string;
  addressLine: string;
  region: string;
  websiteDisplay: string;
  appUrl: string;
}

export function organizationJsonLd(input: OrganizationLd): object {
  const parts = input.addressLine
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const street = parts.slice(0, -1).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${input.appUrl}/#organization`,
    name: input.name,
    description: input.description,
    url: input.appUrl,
    email: input.email,
    telephone: input.telephone,
    address: {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      addressLocality: last,
      addressRegion: input.region,
      addressCountry: "KE",
    },
    logo: `${input.appUrl}/brand/lalica-logo-white-background.jpg`,
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
  areaServed: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: input.providerName,
      url: input.providerUrl,
    },
    areaServed: {
      "@type": "Place",
      name: input.areaServed,
    },
  };
}

export function breadcrumbsJsonLd(items: { name: string; path: string }[]): object {
  const env = getServerEnv();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${env.appUrl}${item.path}`,
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  publisherName: string;
  publisherUrl: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      url: input.publisherUrl,
    },
  };
}

export function profilePageJsonLd(input: OrganizationLd): object {
  return organizationJsonLd(input);
}
