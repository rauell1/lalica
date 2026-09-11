import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { LoginButtons } from "@/components/admin/login-buttons";
import { LogoLockup } from "@/components/admin/logo-lockup";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Staff sign in | Lalica Engineering Limited" },
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/admin");

  const env = getServerEnv();
  const googleEnabled = Boolean(env.googleClientId && env.googleClientSecret);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-brand-100 bg-white p-8 shadow-sm">
          <LogoLockup />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
            Staff sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Access is for authorised Lalica staff only. New accounts stay
            inactive until an administrator activates them.
          </p>
          <div className="mt-6">
            <LoginButtons googleEnabled={googleEnabled} demoEnabled={env.demoModeEnabled} />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-500">
          Problems signing in? Contact the site administrator.
        </p>
      </div>
    </main>
  );
}
