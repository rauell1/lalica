import type { MetadataRoute } from "next";

import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const env = getServerEnv();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
