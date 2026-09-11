import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";

import { getSettingsCached } from "@/lib/settings/cache";
import { getServerEnv } from "@/lib/env";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieBanner } from "@/components/public/cookie-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const env = getServerEnv();
  const seo = await getSettingsCached("seo_defaults")();
  const company = await getSettingsCached("company")();
  return {
    metadataBase: new URL(env.appUrl),
    title: {
      default: seo.defaultTitle,
      template: `%s | ${seo.siteName}`,
    },
    description: seo.defaultDescription,
    applicationName: seo.siteName,
    openGraph: {
      type: "website",
      siteName: seo.siteName,
      locale: "en_KE",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: company.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10358c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col bg-white">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
