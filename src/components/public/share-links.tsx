"use client";

import { useState } from "react";
import { ShareIcon } from "./service-icons";

/**
 * Share controls for news and CSR pages: Web Share API where supported,
 * a copy-to-clipboard fallback, plus explicit links to messaging and
 * social platforms.
 */
export function ShareLinks({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);

  function absoluteUrl(): string {
    if (typeof window === "undefined") return path;
    return window.location.origin + path;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the user can still share via other buttons.
    }
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title,
        url: absoluteUrl(),
      });
    } catch {
      // Sharing cancelled or unavailable; nothing to do.
    }
  }

  const encodedUrl = encodeURIComponent(absoluteUrl());
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-2 text-sm font-bold text-ink-700">
        <ShareIcon className="h-4.5 w-4.5" />
        Share
      </span>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          type="button"
          onClick={nativeShare}
          className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-800 transition-soft hover:bg-surface"
        >
          Share this page
        </button>
      )}
      <button
        type="button"
        onClick={copyLink}
        className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-800 transition-soft hover:bg-surface"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-800 transition-soft hover:bg-surface"
      >
        WhatsApp
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-800 transition-soft hover:bg-surface"
      >
        LinkedIn
      </a>
    </div>
  );
}
