/**
 * Staff user management (administrators only).
 *
 * The last active administrator can never be demoted or deactivated,
 * matching the access control requirements.
 */

import { and, desc, eq, ne } from "drizzle-orm";

import { getDb, users, type UserRole } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertPermission, type SessionUser } from "@/lib/auth/roles";
import { writeAudit } from "@/lib/audit/service";

export interface UserRow {
  id: string;
  subject: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listUsers(actor: SessionUser): Promise<UserRow[]> {
  assertPermission(actor.role, "canManageUsers");
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      subject: users.subject,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows;
}

async function countActiveAdministrators(excludeId?: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "administrator"),
        eq(users.active, true),
        excludeId ? ne(users.id, excludeId) : undefined,
      ),
    );
  return rows.length;
}

export async function setUserRole(input: {
  actor: SessionUser;
  userId: string;
  role: UserRole;
}): Promise<UserRow> {
  assertPermission(input.actor.role, "canManageUsers");
  const db = getDb();
  const existing = await findUser(input.userId);

  if (existing.role === "administrator" && input.role !== "administrator") {
    const remaining = await countActiveAdministrators(existing.id);
    if (remaining === 0) {
      throw new AppError(
        "conflict",
        "This is the last active administrator. Promote another administrator before changing this role.",
      );
    }
  }

  const updated = await db
    .update(users)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(users.id, input.userId))
    .returning({
      id: users.id,
      subject: users.subject,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  await writeAudit({
    actorId: input.actor.id,
    action: "user.role_changed",
    entityType: "user",
    entityId: input.userId,
    metadata: { role: input.role },
  });
  return updated[0] as UserRow;
}

export async function setUserActive(input: {
  actor: SessionUser;
  userId: string;
  active: boolean;
}): Promise<UserRow> {
  assertPermission(input.actor.role, "canManageUsers");
  const db = getDb();
  const existing = await findUser(input.userId);

  if (existing.role === "administrator" && !input.active) {
    const remaining = await countActiveAdministrators(existing.id);
    if (remaining === 0) {
      throw new AppError(
        "conflict",
        "This is the last active administrator. Activate another administrator before deactivating this account.",
      );
    }
  }

  const updated = await db
    .update(users)
    .set({ active: input.active, updatedAt: new Date() })
    .where(eq(users.id, input.userId))
    .returning({
      id: users.id,
      subject: users.subject,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  await writeAudit({
    actorId: input.actor.id,
    action: input.active ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: input.userId,
  });
  return updated[0] as UserRow;
}

async function findUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) throw new AppError("not_found", "This user does not exist.");
  return user as UserRow;
}
