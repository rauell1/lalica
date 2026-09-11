"use server";

/**
 * Server actions for the admin CMS.
 *
 * Every action re-authenticates the caller from the session and re-reads
 * the current user row, then enforces role permissions inside the service
 * layer. Actions return plain results so forms can show understandable
 * messages. Cache invalidation runs only after successful mutations.
 */

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/roles";
import { AppError, errorMessage, isUserFacingError } from "@/lib/errors";
import { invalidateContent, invalidateSettings } from "@/lib/invalidate";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";
import {
  archiveContent,
  createContent,
  deleteContent,
  publishContent,
  restoreContent,
  submitForReview,
  unpublishContent,
  updateContent,
} from "@/lib/content/service";
import { setSettingsValue } from "@/lib/settings/service";
import { listUsers, setUserActive, setUserRole } from "@/lib/users/service";
import { deleteMedia, setMediaStatus, updateMedia } from "@/lib/media/service";
import { updateEnquiry } from "@/lib/enquiry/service";
import { sendEnquiryNotification, type EnquiryNotificationData } from "@/lib/enquiry/notify";
import { runAsActor, enquiries, type ContentType, type UserRole } from "@/lib/db";
import { eq } from "drizzle-orm";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function withActor<T>(
  permission: Permission,
  fn: (actor: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, error: "Your session has expired. Please sign in again." };
    }
    if (!hasPermission(user.role, permission)) {
      return { ok: false, error: "Your role does not allow this action." };
    }
    await enforceLimit(
      "contentMutation",
      hashIdentifier("contentMutation", `user:${user.id}`),
    );
    const data = await fn(user);
    return { ok: true, data };
  } catch (error) {
    if (isUserFacingError(error)) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    }
    console.error("[action] unexpected error", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

export async function createContentAction(input: {
  type: ContentType;
  draft: unknown;
}): Promise<ActionResult<{ id: string }>> {
  return withActor("canEditContent", async (actor) => {
    const row = await createContent({ actor, type: input.type, draft: input.draft });
    return { id: row.id };
  });
}

export async function updateContentAction(input: {
  id: string;
  draft: unknown;
  expectedVersion: number;
}): Promise<ActionResult<{ version: number }>> {
  return withActor("canEditContent", async (actor) => {
    const row = await updateContent({
      actor,
      id: input.id,
      draft: input.draft,
      expectedVersion: input.expectedVersion,
    });
    return { version: row.version };
  });
}

export async function submitForReviewAction(input: {
  id: string;
}): Promise<ActionResult> {
  return withActor("canEditContent", async (actor) => {
    await submitForReview(actor, input.id);
  });
}

export async function publishContentAction(input: {
  id: string;
  type: ContentType;
}): Promise<ActionResult> {
  return withActor("canPublish", async (actor) => {
    const row = await publishContent(actor, input.id);
    invalidateContent(input.type, row.slug);
  });
}

export async function unpublishContentAction(input: {
  id: string;
  type: ContentType;
  slug: string;
}): Promise<ActionResult> {
  return withActor("canPublish", async (actor) => {
    await unpublishContent(actor, input.id);
    invalidateContent(input.type, input.slug);
  });
}

export async function archiveContentAction(input: {
  id: string;
  type: ContentType;
  slug: string;
}): Promise<ActionResult> {
  return withActor("canEditContent", async (actor) => {
    await archiveContent(actor, input.id);
    invalidateContent(input.type, input.slug);
  });
}

export async function restoreContentAction(input: {
  id: string;
  type: ContentType;
}): Promise<ActionResult> {
  return withActor("canEditContent", async (actor) => {
    await restoreContent(actor, input.id);
    invalidateContent(input.type);
  });
}

export async function deleteContentAction(input: {
  id: string;
  type: ContentType;
}): Promise<ActionResult> {
  return withActor("canEditContent", async (actor) => {
    await deleteContent(actor, input.id);
    invalidateContent(input.type);
  });
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export async function updateSettingsAction(input: {
  key: string;
  value: unknown;
}): Promise<ActionResult> {
  return withActor("canManageSettings", async (actor) => {
    await setSettingsValue({
      actor,
      key: input.key as never,
      value: input.value,
    });
    invalidateSettings(input.key);
  });
}

export async function publishPrivacyAction(input: {
  value: unknown;
}): Promise<ActionResult> {
  return withActor("canManageSettings", async (actor) => {
    if (!input.value || typeof input.value !== "object") {
      throw new AppError(
        "validation",
        "The privacy policy could not be read. Save the sections first, then publish.",
      );
    }
    const value = input.value as Record<string, unknown>;
    const draft = (value.draft ?? { sections: [] }) as Record<string, unknown>;
    const nextValue = {
      ...value,
      draft,
      publishedSections: draft.sections ?? [],
      publishedAt: new Date().toISOString(),
      version: (typeof value.version === "number" ? value.version : 0) + 1,
    };
    await setSettingsValue({ actor, key: "privacy", value: nextValue });
    invalidateSettings("privacy");
  });
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export async function setUserRoleAction(input: {
  userId: string;
  role: UserRole;
}): Promise<ActionResult> {
  return withActor("canManageUsers", async (actor) => {
    await setUserRole({ actor, userId: input.userId, role: input.role });
  });
}

export async function setUserActiveAction(input: {
  userId: string;
  active: boolean;
}): Promise<ActionResult> {
  return withActor("canManageUsers", async (actor) => {
    await setUserActive({ actor, userId: input.userId, active: input.active });
  });
}

export async function listUsersAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listUsers>>>
> {
  return withActor("canManageUsers", async (actor) => listUsers(actor));
}

/* ------------------------------------------------------------------ */
/* Media                                                              */
/* ------------------------------------------------------------------ */

export async function updateMediaAction(input: {
  id: string;
  altText: string;
  caption?: string;
  sourceNote?: string;
  rightsStatus?: "cleared" | "unconfirmed" | "illustrative";
}): Promise<ActionResult> {
  return withActor("canUploadMedia", async (actor) => {
    await updateMedia({ actor, ...input });
  });
}

export async function setMediaStatusAction(input: {
  id: string;
  status: "draft" | "published";
}): Promise<ActionResult> {
  return withActor("canUploadMedia", async (actor) => {
    await setMediaStatus(actor, input.id, input.status);
  });
}

export async function deleteMediaAction(input: {
  id: string;
}): Promise<ActionResult> {
  return withActor("canUploadMedia", async (actor) => {
    await deleteMedia(actor, input.id);
  });
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                          */
/* ------------------------------------------------------------------ */

export async function updateEnquiryAction(input: {
  id: string;
  status?: "new" | "in_progress" | "resolved";
  assignedToId?: string | null;
}): Promise<ActionResult> {
  return withActor("canAccessEnquiries", async (actor) => {
    await updateEnquiry({ actor, ...input });
  });
}

export async function retryEnquiryNotificationAction(input: {
  id: string;
}): Promise<ActionResult<{ status: string }>> {
  return withActor("canAccessEnquiries", async (actor) => {
    const enquiry = await runAsActor(actor.id, async (db) => {
      const rows = await db
        .select()
        .from(enquiries)
        .where(eq(enquiries.id, input.id))
        .limit(1);
      return rows[0];
    });
    if (!enquiry) {
      throw new AppError("not_found", "This enquiry does not exist.");
    }
    const data: EnquiryNotificationData = {
      publicRef: enquiry.publicRef,
      name: enquiry.name,
      organisation: enquiry.organisation ?? "",
      email: enquiry.email,
      telephone: enquiry.telephone ?? "",
      serviceInterest: enquiry.serviceInterest,
      message: enquiry.message,
    };
    const result = await sendEnquiryNotification(data);
    await runAsActor(actor.id, (db) =>
      db
        .update(enquiries)
        .set({
          notificationStatus: result.status,
          notificationError: result.error ?? null,
          updatedAt: new Date(),
        })
        .where(eq(enquiries.id, input.id)),
    );
    return { status: result.status };
  });
}

export async function actionErrorMessage(error: unknown): Promise<string> {
  return errorMessage(error);
}
