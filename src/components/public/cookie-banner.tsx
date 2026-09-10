"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "lalica-cookie-consent";

/**
 * This site sets no advertising or analytics cookies itself. The banner
 * exists so the preference is explicit and the note stays honest: the only
 * cookie placed by the application is the staff sign-in session cookie,
 * which visitors never receive.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== "dismissed") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Storage unavailable; the banner simply reappears next visit.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 animate-slide-up"
    >
      <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-lg border border-ink-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            This website uses no advertising or analytics cookies. The only
            cookie the application sets is for staff sign-in sessions, which
            visitors never receive. See the{" "}
            <Link href="/privacy" className="font-bold text-brand-700 underline transition-soft hover:text-brand-600">
              privacy policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-600"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
