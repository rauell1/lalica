/**
 * Staff user management (administrators only).
 *
 * The last active administrator can never be demoted or deactivated,
 * matching the access control requirements.
 */

import { and, desc, eq, ne } from "drizzle-orm";

import { runAsActor, users, type UserRole } from "@/lib/db";
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
  return runAsActor(actor.id, (db) =>
    db
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
      .orderBy(desc(users.createdAt)),
  );
}

async function countActiveAdministrators(
  actorId: string,
  excludeId?: string,
): Promise<number> {
  const rows = await runAsActor(actorId, (db) =>
    db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, "administrator"),
          eq(users.active, true),
          excludeId ? ne(users.id, excludeId) : undefined,
        ),
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
  const existing = await findUser(input.actor.id, input.userId);

  if (existing.role === "administrator" && input.role !== "administrator") {
    const remaining = await countActiveAdministrators(input.actor.id, existing.id);
    if (remaining === 0) {
      throw new AppError(
        "conflict",
        "This is the last active administrator. Promote another administrator before changing this role.",
      );
    }
  }

  const updated = await runAsActor(input.actor.id, (db) =>
    db
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
      }),
  );
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
  const existing = await findUser(input.actor.id, input.userId);

  if (existing.role === "administrator" && !input.active) {
    const remaining = await countActiveAdministrators(input.actor.id, existing.id);
    if (remaining === 0) {
      throw new AppError(
        "conflict",
        "This is the last active administrator. Activate another administrator before deactivating this account.",
      );
    }
  }

  const updated = await runAsActor(input.actor.id, (db) =>
    db
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
      }),
  );
  await writeAudit({
    actorId: input.actor.id,
    action: input.active ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: input.userId,
  });
  return updated[0] as UserRow;
}

async function findUser(actorId: string, userId: string) {
  const user = await runAsActor(actorId, async (db) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0];
  });
  if (!user) throw new AppError("not_found", "This user does not exist.");
  return user as UserRow;
}
