/**
 * Better Auth instance configuration.
 *
 * Authentication is invite only in practice: there is no public
 * registration, and every account created by a provider sign-in starts
 * inactive with no role until an administrator activates it. The first
 * administrator is bootstrapped through a documented one-time script
 * (scripts/bootstrap-admin.ts) tied to a verified identity.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { getDb, users, accounts, sessions, verifications } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

const globalForAuth = globalThis as unknown as {
  __lalicaAuth?: ReturnType<typeof createAuth>;
};

function createAuth() {
  const env = getServerEnv();

  const socialProviders: Record<string, unknown> = {};
  if (env.googleClientId && env.googleClientSecret) {
    socialProviders.google = {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    };
  }

  return betterAuth({
    baseURL: env.appUrl,
    basePath: "/api/auth",
    secret: env.authSecret,
    appName: "Lalica CMS",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: {
      enabled: env.allowEmailPassword,
      // Email/password must only be enabled together with verified
      // invite-only provisioning. Documented in docs/authentication.md.
      requireEmailVerification: true,
    },
    socialProviders,
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    rateLimit: {
      enabled: true,
      window: 15 * 60, // 15 minutes
      max: 10,
    },
    trustedOrigins: [env.appUrl],
    databaseHooks: {
      account: {
        create: {
          after: async (account) => {
            try {
              const subject = `${account.providerId}:${account.accountId}`;
              const db = getDb();
              await db
                .update(users)
                .set({ subject })
                .where(eq(users.id, account.userId));
            } catch (error) {
              // Never block authentication because the subject could not
              // be recorded; log it for operators instead.
              console.error("[auth] failed to record user subject", error);
            }
          },
        },
      },
    },
  });
}

export function getAuth() {
  if (!globalForAuth.__lalicaAuth) {
    globalForAuth.__lalicaAuth = createAuth();
  }
  return globalForAuth.__lalicaAuth;
}

export type Auth = ReturnType<typeof getAuth>;

/** Session cookie name used by Better Auth with the default prefix. */
export const SESSION_COOKIE_NAME = "better-auth.session_token";
