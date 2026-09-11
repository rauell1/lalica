/**
 * Server side session helpers.
 *
 * Sensitive operations always re-read the user row from the database so
 * role changes and disabled accounts take effect immediately without
 * relying on stale session state.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { runAsActor, users, type UserRole } from "@/lib/db";
import type { SessionUser } from "./roles";
import { getAuth } from "./config";

export async function getSessionUser(): Promise<SessionUser | null> {
  const requestHeaders = await headers();
  try {
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    if (!session) return null;

    // Runs through the RLS-gated connection with the candidate id: the
    // users_self_select policy only ever lets a row read its own record,
    // so this both looks up the role and, independently of the app code,
    // proves the row genuinely belongs to the signed-in identity.
    const user = await runAsActor(session.user.id, async (db) => {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          active: users.active,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      return rows[0];
    });
    if (!user || !user.active || !user.role) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

/**
 * Page level guard: redirect unauthenticated visitors to the login page
 * and role mismatches to the dashboard. UI only; the data access layer
 * remains the security boundary.
 */
export async function requireAdminPage(
  allowedRoles: UserRole[],
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!allowedRoles.includes(user.role)) {
    redirect("/admin");
  }
  return user;
}
