/**
 * Request-time security headers and Content Security Policy.
 *
 * Runtime nodejs proxy (Next 16 renamed middleware to proxy). Applied to
 * all responses including static assets. The CSP is kept practical:
 * no inline scripts are used by the application, but Next.js needs
 * 'unsafe-inline' for styles during dynamic rendering; scripts stay locked
 * to self plus the Turnstile origins only when Turnstile is configured.
 */

import { NextResponse, type NextRequest } from "next/server";

const TURNSTILE_ORIGINS =
  process.env.NEXT_PUBLIC_ENQUIRY_TURNSTILE_SITE_KEY
    ? "https://challenges.cloudflare.com https://*.challenges.cloudflare.com"
    : "";

function cspHeader(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGINS}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", cspHeader());
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // Never cache auth and admin responses; keep Next's own cache headers
  // for everything else.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/admin")) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
  }

  return response;
}
