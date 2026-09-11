"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginButtons({
  googleEnabled,
  demoEnabled,
}: {
  googleEnabled: boolean;
  demoEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function googleSignIn() {
    setBusy("google");
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/admin" }),
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.url) {
        setError(data?.error ?? "Google sign-in failed.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Google sign-in failed. Please try again.");
      setBusy(null);
    }
  }

  async function demoSignIn(role: string) {
    setBusy(role);
    setError(null);
    try {
      const response = await fetch("/api/auth/demo-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Demo sign-in failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Demo sign-in failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {googleEnabled && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={googleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-900 transition-soft hover:bg-surface disabled:opacity-60"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.3 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          {busy === "google" ? "Redirecting..." : "Continue with Google"}
        </button>
      )}
      {!googleEnabled && !demoEnabled && (
        <p className="rounded-md bg-accent-50 px-4 py-3 text-sm font-semibold text-ink-700">
          Sign-in is not configured yet. Set GOOGLE_CLIENT_ID and
          GOOGLE_CLIENT_SECRET (or enable demo mode for local development).
          See docs/authentication.md.
        </p>
      )}
      {demoEnabled && (
        <div className="rounded-md border border-accent-500 bg-accent-50 p-4">
          <p className="text-xs font-bold tracking-wider text-ink-700 uppercase">
            Local demo accounts
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            For development and acceptance testing only. Never available in
            production.
          </p>
          <div className="mt-3 grid gap-2">
            {(
              [
                ["administrator", "Sign in as Administrator"],
                ["editor", "Sign in as Editor"],
                ["enquiry_manager", "Sign in as Enquiry Manager"],
              ] as const
            ).map(([role, label]) => (
              <button
                key={role}
                type="button"
                disabled={busy !== null}
                onClick={() => demoSignIn(role)}
                className="rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition-soft hover:bg-surface disabled:opacity-60"
              >
                {busy === role ? "Signing in..." : label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
