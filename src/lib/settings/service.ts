/**
 * Site settings data access.
 *
 * Raw (uncached) functions are used by tests and scripts; the web
 * application reads through the cached wrappers in ./cache.ts and
 * invalidates them after successful settings changes.
 */

import { eq } from "drizzle-orm";

import { getDb, siteSettings } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertPermission, type SessionUser } from "@/lib/auth/roles";
import { writeAudit } from "@/lib/audit/service";
import {
  parseSettingsValue,
  settingsFieldErrors,
  settingsSchemas,
  type SettingsKey,
  type SettingsValues,
} from "./schemas";

export type { SettingsKey };

export async function getRawSettingsValue<K extends SettingsKey>(key: K) {
  const db = getDb();
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSettingsValue<K extends SettingsKey>(
  key: K,
): Promise<SettingsValues[K]> {
  const row = await getRawSettingsValue(key);
  if (!row) {
    // Unseeded keys resolve to their schema defaults so the site works
    // before the seed has run.
    return settingsSchemas[key].parse({}) as SettingsValues[K];
  }
  return settingsSchemas[key].parse(row.value) as SettingsValues[K];
}

export async function setSettingsValue<K extends SettingsKey>(input: {
  actor: SessionUser;
  key: K;
  value: unknown;
}): Promise<void> {
  assertPermission(input.actor.role, "canManageSettings");

  const fieldErrors = settingsFieldErrors(input.key, input.value);
  if (fieldErrors) {
    throw new AppError("validation", "Please correct the highlighted fields.", {
      fieldErrors,
    });
  }

  const parsed = parseSettingsValue(input.key, input.value);
  const db = getDb();

  await db
    .insert(siteSettings)
    .values({
      key: input.key,
      value: parsed as Record<string, unknown>,
      updatedById: input.actor.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: parsed as Record<string, unknown>,
        updatedById: input.actor.id,
        updatedAt: new Date(),
      },
    });

  await writeAudit({
    actorId: input.actor.id,
    action: "settings.update",
    entityType: "site_settings",
    entityId: input.key,
    metadata: { key: input.key },
  });
}
