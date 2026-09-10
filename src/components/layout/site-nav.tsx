"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavLink {
  label: string;
  href: string;
}

export function SiteNav({
  links,
  ctaHref,
}: {
  links: NavLink[];
  ctaHref: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setOpen(false);
    setExpanded(false);
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("nav-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav aria-label="Main navigation" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition-soft ${
                  isActive(link.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-700 hover:bg-surface hover:text-brand-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="ml-2">
            <Link
              href={ctaHref}
              className="rounded-md bg-accent-500 px-4 py-2 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
            >
              Request a Quote
            </Link>
          </li>
        </ul>
      </nav>

      <details
        ref={detailsRef}
        className="relative lg:hidden"
        onToggle={(event) => setExpanded((event.target as HTMLDetailsElement).open)}
      >
        <summary
          id="nav-toggle"
          aria-label={expanded ? "Close menu" : "Open menu"}
          aria-expanded={expanded}
          className="flex cursor-pointer list-none items-center rounded-md border border-ink-200 px-3 py-2 text-ink-800 transition-soft hover:bg-surface [&::-webkit-details-marker]:hidden"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {expanded ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          <span className="ml-2 text-sm font-bold">{expanded ? "Close" : "Menu"}</span>
        </summary>
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-ink-100 bg-white p-2 shadow-card">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm font-semibold transition-soft ${
                    isActive(link.href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-surface hover:text-brand-700"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={ctaHref}
                className="block rounded-md bg-accent-500 px-3 py-2 text-sm font-bold text-ink-900 transition-soft hover:bg-accent-400"
              >
                Request a Quote
              </Link>
            </li>
          </ul>
        </div>
      </details>
    </>
  );
}
