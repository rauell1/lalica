/**
 * Content data access and workflow operations.
 *
 * Every mutation checks the caller's role, reads the current record state,
 * and rejects access to records the caller may not see. Editing a
 * published item only changes the draft payload; the public site keeps
 * serving the last published snapshot until an administrator publishes
 * the replacement.
 */

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { content, getDb, media, siteSettings, type ContentStatus, type ContentType } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertPermission, hasPermission, type SessionUser } from "@/lib/auth/roles";
import { writeAudit } from "@/lib/audit/service";
import { getRawSettingsValue } from "@/lib/settings/service";
import { redirectsSettingsSchema } from "@/lib/settings/schemas";
import { dashViolationMessage, findDashViolations } from "@/lib/utils/text";
import {
  collectDraftMediaIds,
  CONTENT_TYPE_PUBLIC_BASE,
  draftFieldErrors,
  parseDraft,
  type ContentDraft,
} from "./types";
import { collectBodyMediaIds, type Body } from "./blocks";

export interface ContentRow {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  excerpt: string;
  body: unknown;
  draft: unknown;
  publishedSnapshot: unknown;
  status: ContentStatus;
  coverMediaId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  metadata: unknown;
  createdById: string;
  updatedById: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/* ------------------------------------------------------------------ */
/* Slug helpers                                                       */
/* ------------------------------------------------------------------ */

export async function ensureUniqueSlug(
  type: ContentType,
  desired: string,
  excludeId?: string,
): Promise<string> {
  const db = getDb();
  let slug = desired;
  let attempt = 0;
  for (;;) {
    const rows = await db
      .select({ id: content.id })
      .from(content)
      .where(and(eq(content.type, type), eq(content.slug, slug)))
      .limit(1);
    const conflict = rows[0];
    if (!conflict || conflict.id === excludeId) return slug;
    attempt += 1;
    slug = `${desired.replace(/-+$/, "")}-${attempt + 1}`.slice(0, 80);
  }
}

/* ------------------------------------------------------------------ */
/* Public reads (raw, uncached)                                       */
/* ------------------------------------------------------------------ */

export async function getPublishedBySlug(
  type: ContentType,
  slug: string,
): Promise<ContentRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.type, type),
        eq(content.slug, slug),
        eq(content.status, "published"),
      ),
    )
    .limit(1);
  return (rows[0] as ContentRow | undefined) ?? null;
}

export async function listPublished(
  type: ContentType,
  options?: { limit?: number; offset?: number },
): Promise<ContentRow[]> {
  const db = getDb();
  const order =
    type === "service"
      ? sql`(${content.metadata}->>'order')::int asc`
      : desc(content.publishedAt);
  return (await db
    .select()
    .from(content)
    .where(and(eq(content.type, type), eq(content.status, "published")))
    .orderBy(order)
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0)) as ContentRow[];
}

export async function countPublished(type: ContentType): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(content)
    .where(and(eq(content.type, type), eq(content.status, "published")));
  return rows[0]?.count ?? 0;
}

export interface HomepageContent {
  projects: ContentRow[];
  csrStories: ContentRow[];
  news: ContentRow[];
}

export async function getHomepagePublished(): Promise<HomepageContent> {
  const [projects, csrStories, news] = await Promise.all([
    listPublished("project", { limit: 3 }),
    listPublished("csr_story", { limit: 3 }),
    listPublished("news", { limit: 3 }),
  ]);
  return { projects, csrStories, news };
}

/* ------------------------------------------------------------------ */
/* Admin reads                                                        */
/* ------------------------------------------------------------------ */

export async function listContentForAdmin(input: {
  actor: SessionUser;
  type: ContentType;
  status?: ContentStatus | "all";
  q?: string;
  page: number;
  pageSize: number;
}) {
  assertPermission(input.actor.role, "canEditContent");
  const db = getDb();

  const conditions = [eq(content.type, input.type)];
  if (input.status && input.status !== "all") {
    conditions.push(eq(content.status, input.status));
  }
  if (input.q) {
    conditions.push(
      or(
        ilike(content.title, `%${input.q}%`),
        ilike(content.slug, `%${input.q}%`),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(content)
    .where(and(...conditions))
    .orderBy(desc(content.updatedAt))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(content)
    .where(and(...conditions));

  return { rows: rows as ContentRow[], total: countRows[0]?.count ?? 0 };
}

export async function getContentForAdmin(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canEditContent");
  const db = getDb();
  const rows = await db
    .select()
    .from(content)
    .where(eq(content.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new AppError("not_found", "This content item does not exist.");
  }
  return row as ContentRow;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                          */
/* ------------------------------------------------------------------ */

export async function createContent<T extends ContentType>(input: {
  actor: SessionUser;
  type: T;
  draft: unknown;
}): Promise<ContentRow> {
  assertPermission(input.actor.role, "canEditContent");

  const parsed = validateDraftOrThrow(input.type, input.draft);
  const slug = await ensureUniqueSlug(input.type, parsed.slug);
  const finalDraft = { ...parsed, slug };

  const db = getDb();
  const inserted = await db
    .insert(content)
    .values({
      type: input.type,
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      body: [],
      draft: finalDraft,
      status: "draft",
      metadata: parsed.metadata,
      createdById: input.actor.id,
      updatedById: input.actor.id,
      version: 1,
    })
    .returning();

  const row = inserted[0] as ContentRow;
  await writeAudit({
    actorId: input.actor.id,
    action: "content.create",
    entityType: input.type,
    entityId: row.id,
    metadata: { title: parsed.title, slug: row.slug },
  });
  return row;
}

export async function updateContent(input: {
  actor: SessionUser;
  id: string;
  draft: unknown;
  expectedVersion: number;
}): Promise<ContentRow> {
  assertPermission(input.actor.role, "canEditContent");
  const db = getDb();

  const existing = await getContentForAdmin(input.actor, input.id);
  if (existing.status === "archived") {
    throw new AppError("conflict", "Archived items cannot be edited.");
  }
  if (existing.version !== input.expectedVersion) {
    throw new AppError(
      "conflict",
      "This item was changed by someone else since you opened it. Reload the page to see the latest version, then try again.",
    );
  }

  const parsed = validateDraftOrThrow(existing.type, input.draft);
  const slug = await ensureUniqueSlug(existing.type, parsed.slug, existing.id);
  const finalDraft = { ...parsed, slug };

  const updated = await db
    .update(content)
    .set({
      draft: finalDraft,
      updatedById: input.actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
      // Keep the public columns untouched: editing a published item never
      // exposes draft changes.
    })
    .where(eq(content.id, existing.id))
    .returning();

  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: input.actor.id,
    action: "content.update",
    entityType: existing.type,
    entityId: existing.id,
    metadata: { title: parsed.title, slug: row.slug },
  });
  return row;
}

export async function submitForReview(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canSubmitForReview");
  const existing = await getContentForAdmin(actor, id);
  if (existing.status === "published" || existing.status === "archived") {
    throw new AppError(
      "conflict",
      "Only draft items can be submitted for review.",
    );
  }
  const db = getDb();
  const updated = await db
    .update(content)
    .set({
      status: "in_review",
      updatedById: actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    })
    .where(eq(content.id, id))
    .returning();
  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: actor.id,
    action: "content.submit_review",
    entityType: existing.type,
    entityId: id,
  });
  return row;
}

export async function publishContent(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canPublish");
  const db = getDb();

  const existing = await getContentForAdmin(actor, id);
  if (existing.status === "archived") {
    throw new AppError("conflict", "Archived items cannot be published.");
  }

  // Validate before touching the database so malformed drafts can never be
  // published. Publish is the last line of defence because drafts may have
  // been stored by older or out-of-band processes.
  let draft: ContentDraft;
  try {
    draft = parseDraft(existing.type, existing.draft);
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(
        "validation",
        "This item cannot be published because its draft contains errors. Open the editor, correct the highlighted fields, and try again.",
        {
          fieldErrors:
            draftFieldErrors(existing.type, existing.draft) ?? undefined,
        },
      );
    }
    throw error;
  }
  assertNoForbiddenDashes(draft);

  await assertReferencedMediaPublished(draft);

  const previousSlug =
    existing.publishedSnapshot &&
    typeof existing.publishedSnapshot === "object" &&
    "slug" in (existing.publishedSnapshot as Record<string, unknown>)
      ? String((existing.publishedSnapshot as Record<string, unknown>).slug)
      : existing.slug;

  if (draft.slug !== previousSlug && existing.status === "published") {
    await registerSlugRedirect(existing.type, previousSlug, draft.slug);
  }

  const snapshot = {
    ...draft,
    publishedAt: new Date().toISOString(),
    publishedById: actor.id,
  };

  const updated = await db
    .update(content)
    .set({
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      body: draft.body,
      coverMediaId: draft.coverMediaId,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      metadata: draft.metadata,
      publishedSnapshot: snapshot,
      status: "published",
      publishedAt: new Date(),
      updatedById: actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    })
    .where(eq(content.id, id))
    .returning();

  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: actor.id,
    action: "content.publish",
    entityType: existing.type,
    entityId: id,
    metadata: { title: draft.title, slug: row.slug, version: row.version },
  });
  return row;
}

export async function unpublishContent(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canPublish");
  const existing = await getContentForAdmin(actor, id);
  if (existing.status !== "published") {
    throw new AppError("conflict", "Only published items can be unpublished.");
  }
  const db = getDb();
  const updated = await db
    .update(content)
    .set({
      status: "draft",
      updatedById: actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    })
    .where(eq(content.id, id))
    .returning();
  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: actor.id,
    action: "content.unpublish",
    entityType: existing.type,
    entityId: id,
    metadata: { title: existing.title, slug: existing.slug },
  });
  return row;
}

export async function archiveContent(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canEditContent");
  const existing = await getContentForAdmin(actor, id);
  if (existing.status === "archived") {
    throw new AppError("conflict", "This item is already archived.");
  }
  const db = getDb();
  const updated = await db
    .update(content)
    .set({
      status: "archived",
      updatedById: actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    })
    .where(eq(content.id, id))
    .returning();
  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: actor.id,
    action: "content.archive",
    entityType: existing.type,
    entityId: id,
    metadata: { title: existing.title, slug: existing.slug },
  });
  return row;
}

export async function restoreContent(
  actor: SessionUser,
  id: string,
): Promise<ContentRow> {
  assertPermission(actor.role, "canEditContent");
  const existing = await getContentForAdmin(actor, id);
  if (existing.status !== "archived") {
    throw new AppError("conflict", "Only archived items can be restored.");
  }
  const db = getDb();
  const updated = await db
    .update(content)
    .set({
      status: "draft",
      updatedById: actor.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    })
    .where(eq(content.id, id))
    .returning();
  const row = updated[0] as ContentRow;
  await writeAudit({
    actorId: actor.id,
    action: "content.restore",
    entityType: existing.type,
    entityId: id,
  });
  return row;
}

export async function deleteContent(
  actor: SessionUser,
  id: string,
): Promise<void> {
  assertPermission(actor.role, "canEditContent");
  const existing = await getContentForAdmin(actor, id);
  if (existing.status !== "archived") {
    throw new AppError(
      "conflict",
      "Archive an item before deleting it. Published and draft items cannot be deleted directly.",
    );
  }
  const db = getDb();
  await db.delete(content).where(eq(content.id, id));
  await writeAudit({
    actorId: actor.id,
    action: "content.delete",
    entityType: existing.type,
    entityId: id,
    metadata: { title: existing.title, slug: existing.slug },
  });
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                 */
/* ------------------------------------------------------------------ */

function validateDraftOrThrow<T extends ContentType>(
  type: T,
  value: unknown,
): ContentDraft<T> {
  const fieldErrors = draftFieldErrors(type, value);
  if (fieldErrors) {
    throw new AppError("validation", "Please correct the highlighted fields.", {
      fieldErrors,
    });
  }
  return parseDraft(type, value);
}

function assertNoForbiddenDashes(draft: ContentDraft): void {
  const violations = findDashViolations(draft);
  if (violations.length > 0) {
    throw new AppError("validation", dashViolationMessage(violations));
  }
}

export async function assertReferencedMediaPublished(
  draft: ContentDraft,
): Promise<void> {
  const ids = collectDraftMediaIds(draft);
  if (ids.length === 0) return;
  const db = getDb();
  const rows = await db
    .select({ id: media.id, status: media.status })
    .from(media)
    .where(and(inArray(media.id, ids), sql`${media.status} != 'published'`))
    .limit(20);
  if (rows.length > 0) {
    throw new AppError(
      "validation",
      "This item uses images that are still marked as draft. Publish the images in the media library first, or remove them from the item.",
      { fieldErrors: { media: rows.map((row) => row.id) } },
    );
  }
}

async function registerSlugRedirect(
  type: ContentType,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  try {
    const row = await getRawSettingsValue("redirects");
    const current = row
      ? redirectsSettingsSchema.parse(row.value)
      : redirectsSettingsSchema.parse({});
    const from = `${CONTENT_TYPE_PUBLIC_BASE[type]}/${oldSlug}`;
    const to = `${CONTENT_TYPE_PUBLIC_BASE[type]}/${newSlug}`;
    const entries = [
      { from, to, createdAt: new Date().toISOString() },
      ...current.entries.filter((entry) => entry.from !== from),
    ].slice(0, 100);
    const db = getDb();
    await db
      .insert(siteSettings)
      .values({ key: "redirects", value: { entries }, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: { entries }, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("[content] failed to register slug redirect", error);
  }
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

export function canViewContentType(actor: SessionUser): boolean {
  return hasPermission(actor.role, "canEditContent");
}

export function collectPublishedBodyMediaIds(body: Body): string[] {
  return collectBodyMediaIds(body);
}

export function newUuid(): string {
  return randomUUID();
}
