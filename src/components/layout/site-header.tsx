import Image from "next/image";

import { getSettingsCached } from "@/lib/settings/cache";
import { countPublishedCached } from "@/lib/content/cache";
import { SiteNav } from "./site-nav";

type NavLink = { label: string; href: string };

function insertBeforeContact(links: NavLink[], entry: NavLink): NavLink[] {
  const contactIndex = links.findIndex((link) => link.href === "/contact");
  if (contactIndex === -1) return [...links, entry];
  return [
    ...links.slice(0, contactIndex),
    entry,
    ...links.slice(contactIndex),
  ];
}

export async function SiteHeader() {
  const [company, navigation, features, newsCount, contacts] =
    await Promise.all([
      getSettingsCached("company")(),
      getSettingsCached("navigation")(),
      getSettingsCached("features")(),
      countPublishedCached("news"),
      getSettingsCached("contacts")(),
    ]);

  const showNews =
    features.newsNav === "on" ||
    (features.newsNav === "auto" && newsCount > 0);

  const baseLinks = navigation.primary.map((entry) => ({
    label: entry.label,
    href: entry.href,
  }));

  const links =
    showNews && !baseLinks.some((link) => link.href === "/news")
      ? insertBeforeContact(baseLinks, { label: "News", href: "/news" })
      : baseLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Lalica Engineering Limited home"
        >
          <Image
            src="/brand/lalica-logo-white-background.jpg"
            alt={`${company.name} logo`}
            width={168}
            height={62}
            priority
            className="h-auto w-40 sm:w-44"
          />
        </a>
        <SiteNav links={links} ctaHref="/contact#enquiry-form" />
        <div className="hidden shrink-0 md:block">
          <a
            href={`tel:${contacts.telephone}`}
            className="text-sm font-bold text-ink-900 transition-soft hover:text-brand-700"
          >
            {contacts.telephoneDisplay}
          </a>
        </div>
      </div>
    </header>
  );
}
