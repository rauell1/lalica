"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ROLE_LABELS, type SessionUser } from "@/lib/auth/roles";
import { LogoLockup } from "./logo-lockup";

interface NavEntry {
  href: string;
  label: string;
  show: boolean;
  exact?: boolean;
}

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const canEditContent = user.role === "administrator" || user.role === "editor";
  const canManageSettings = user.role === "administrator";
  const canManageUsers = user.role === "administrator";
  const canViewAudit = user.role === "administrator";
  const canAccessEnquiries =
    user.role === "administrator" || user.role === "enquiry_manager";

  const entries: NavEntry[] = [
    { href: "/admin", label: "Dashboard", show: true, exact: true },
    { href: "/admin/services", label: "Services", show: canEditContent },
    { href: "/admin/projects", label: "Projects", show: canEditContent },
    { href: "/admin/csr", label: "CSR stories", show: canEditContent },
    { href: "/admin/news", label: "News", show: canEditContent },
    { href: "/admin/media", label: "Media library", show: canEditContent },
    { href: "/admin/enquiries", label: "Enquiries", show: canAccessEnquiries },
    { href: "/admin/settings", label: "Company settings", show: canManageSettings },
    { href: "/admin/users", label: "User access", show: canManageUsers },
    { href: "/admin/audit", label: "Audit history", show: canViewAudit },
  ].filter((entry) => entry.show);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const isActive = (entry: NavEntry) =>
    entry.exact ? pathname === entry.href : pathname.startsWith(entry.href);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-40 border-b border-brand-800 bg-brand-950 text-brand-100 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-5 lg:py-5">
          <div className="rounded-md bg-white p-1.5 lg:inline-block">
            <LogoLockup />
          </div>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="admin-nav"
            aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
            className="rounded-md border border-brand-700 p-2 text-brand-100 lg:hidden"
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
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        <nav
          id="admin-nav"
          aria-label="Admin navigation"
          className={`${mobileOpen ? "block" : "hidden"} border-t border-brand-800 px-3 py-3 lg:block lg:border-t-0`}
        >
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={isActive(entry) ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm font-semibold transition-soft ${
                    isActive(entry)
                      ? "bg-brand-800 text-white"
                      : "text-brand-200 hover:bg-brand-900 hover:text-white"
                  }`}
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-brand-800 pt-3">
            <Link
              href="/"
              target="_blank"
              className="block rounded-md px-3 py-2 text-sm font-semibold text-brand-200 transition-soft hover:bg-brand-900 hover:text-white"
            >
              View public site
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-brand-100 bg-white px-4 py-3 sm:px-6">
          <p className="truncate text-sm font-semibold text-ink-700">
            Signed in as {user.name}{" "}
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
              {ROLE_LABELS[user.role]}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="rounded-md border border-brand-200 px-3 py-1.5 text-sm font-semibold text-ink-700 transition-soft hover:bg-surface disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
