/**
 * Server side environment access with validation.
 *
 * Only variables that must exist for the runtime to work are validated
 * here. Production fails safely: insecure demo authentication is rejected,
 * and a missing auth secret is treated as a configuration error.
 */

export type NodeEnv = "development" | "production" | "test";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDemoEnvironment(): boolean {
  return !isProduction() && process.env.AUTH_DEMO_MODE_ENABLED === "true";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export interface ServerEnv {
  databaseUrl: string;
  authSecret: string;
  appUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  allowEmailPassword: boolean;
  demoModeEnabled: boolean;
  upstashRedisRestUrl?: string;
  upstashRedisRestToken?: string;
  blobReadWriteToken?: string;
  resendApiKey?: string;
  emailFrom?: string;
  emailTo?: string;
  turnstileSecret?: string;
  turnstileSiteKey?: string;
  localLimiterAllowed: boolean;
  enquiryRetentionDays: number;
}

/**
 * Validate the server environment. Throws in production when required
 * security configuration is missing. Never returns secrets to the client.
 */
export function getServerEnv(): ServerEnv {
  const databaseUrl = optionalEnv("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Set it to your Neon PostgreSQL " +
        "connection string (see .env.example and docs/deployment.md).",
    );
  }

  const authSecret = optionalEnv("BETTER_AUTH_SECRET");
  if (!authSecret) {
    if (isProduction()) {
      throw new Error(
        "BETTER_AUTH_SECRET is required in production. " +
          "Generate one with: openssl rand -base64 32",
      );
    }
    throw new Error(
      "BETTER_AUTH_SECRET is not configured. For local development run " +
        "`openssl rand -base64 32` and put the result in .env.local.",
    );
  }

  const appUrl = optionalEnv("PUBLIC_APP_URL");
  if (!appUrl) {
    if (isProduction()) {
      throw new Error(
        "PUBLIC_APP_URL is required in production. Set it to the site origin " +
          "after the domain is connected to Vercel (for example https://www.lalicaengineering.com).",
      );
    }
    throw new Error(
      "PUBLIC_APP_URL is not configured. For local development set " +
        "PUBLIC_APP_URL=http://localhost:3000 in .env.local.",
    );
  }

  return {
    databaseUrl,
    authSecret,
    appUrl,
    googleClientId: optionalEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: optionalEnv("GOOGLE_CLIENT_SECRET"),
    allowEmailPassword: optionalEnv("AUTH_ALLOW_EMAIL_PASSWORD") === "true",
    demoModeEnabled: isDemoEnvironment(),
    upstashRedisRestUrl: optionalEnv("UPSTASH_REDIS_REST_URL"),
    upstashRedisRestToken: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),
    blobReadWriteToken: optionalEnv("BLOB_READ_WRITE_TOKEN"),
    resendApiKey: optionalEnv("RESEND_API_KEY"),
    emailFrom: optionalEnv("EMAIL_FROM"),
    emailTo: optionalEnv("EMAIL_TO"),
    turnstileSecret: optionalEnv("ENQUIRY_TURNSTILE_SECRET"),
    turnstileSiteKey: optionalEnv("NEXT_PUBLIC_ENQUIRY_TURNSTILE_SITE_KEY"),
    localLimiterAllowed:
      !isProduction() || optionalEnv("ALLOW_LOCAL_LIMITER") === "true",
    enquiryRetentionDays: (() => {
      const raw = optionalEnv("ENQUIRY_RETENTION_DAYS");
      if (!raw) return 0;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    })(),
  };
}
