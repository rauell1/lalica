/**
 * Integration tests against the live local PostgreSQL database started by
 * scripts/local-db.py. These exercise the server-side service layer, which
 * is the security boundary for roles, publishing, and enquiry storage.
 *
 * They create and remove rows marked with the "test-" slug prefix and a
 * dedicated test email domain, so they can run repeatedly and alongside a
 * running dev server. Production credentials are never used.
 */

import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { getDb, content, enquiries, media, users, auditLog } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/roles";
import {
  archiveContent,
  createContent,
  deleteContent,
  getPublishedBySlug,
  listPublished,
  publishContent,
  submitForReview,
  unpublishContent,
  updateContent,
} from "@/lib/content/service";
import {
  createEnquiry,
  listEnquiries,
} from "@/lib/enquiry/service";
import {
  enquiryPayloadSchema,
  type EnquiryPayload,
} from "@/lib/enquiry/schemas";
import { authorizeUpload } from "@/lib/media/service";
import {
  getSettingsValue,
  setSettingsValue,
} from "@/lib/settings/service";
import { setUserActive, setUserRole } from "@/lib/users/service";

const TEST_SLUG = "test-integration-project";
const TEST_SLUG_2 = "test-integration-project-renamed";
const TEST_DOMAIN = "@integration-test.invalid";

function uuid(): string {
  return crypto.randomUUID();
}

function paragraph(text: string) {
  return { id: uuid(), type: "paragraph" as const, text };
}

function projectDraft(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Integration Project",
    slug: TEST_SLUG,
    excerpt: "Created by the automated integration suite.",
    body: [paragraph("An integration test body paragraph.")],
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    metadata: {
      sector: "Testing",
      location: "Nairobi",
      clientDisplay: "none",
      clientName: "",
      status: "completed",
      startDate: "",
      endDate: "",
      challenge: "",
      solution: "",
      outcomes: ["A verified outcome"],
      relatedServices: [],
      gallery: [],
    },
    ...overrides,
  };
}

const db = getDb();

async function findUser(subject: string): Promise<SessionUser> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.subject, subject))
    .limit(1);
  const user = rows[0];
  if (!user || !user.role) throw new Error(`missing test user ${subject}`);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

let admin: SessionUser;
let editor: SessionUser;
let enquiryManager: SessionUser;

async function cleanLeftovers(): Promise<void> {
  await db.delete(content).where(like(content.slug, "test-%"));
  await db
    .delete(enquiries)
    .where(like(enquiries.email, `%${TEST_DOMAIN}`));
  await db.delete(media).where(like(media.altText, "integration-test-%"));
}

beforeAll(async () => {
  admin = await findUser("demo:administrator");
  editor = await findUser("demo:editor");
  enquiryManager = await findUser("demo:enquiry_manager");
  await cleanLeftovers();
});

afterAll(async () => {
  await cleanLeftovers();
});

describe("content lifecycle and role enforcement", () => {
  let contentId = "";

  it("editors can create a draft that is invisible to the public", async () => {
    const row = await createContent({
      actor: editor,
      type: "project",
      draft: projectDraft(),
    });
    contentId = row.id;
    expect(row.status).toBe("draft");

    expect(await getPublishedBySlug("project", TEST_SLUG)).toBeNull();
    const published = await listPublished("project");
    expect(published.find((item) => item.id === contentId)).toBeUndefined();
  });

  it("editors cannot publish, administrators can", async () => {
    await expect(publishContent(editor, contentId)).rejects.toMatchObject({
      kind: "forbidden",
    } as Partial<AppError>);

    const row = await publishContent(admin, contentId);
    expect(row.status).toBe("published");
    expect(row.publishedSnapshot).toMatchObject({ slug: TEST_SLUG });
  });

  it("published content is visible publicly after publish with no redeploy", async () => {
    const published = await getPublishedBySlug("project", TEST_SLUG);
    expect(published?.title).toBe("Test Integration Project");
    expect(published?.status).toBe("published");
  });

  it("draft edits never leak to the published snapshot", async () => {
    const updated = await updateContent({
      actor: editor,
      id: contentId,
      draft: projectDraft({
        title: "Edited Draft Title",
        body: [paragraph("Draft-only body text.")],
      }),
      expectedVersion: 2,
    });
    expect(updated.version).toBe(3);
    // Public columns keep the published version until the next publish.
    expect(updated.title).toBe("Test Integration Project");
    expect(updated.draft).toMatchObject({ title: "Edited Draft Title" });

    const published = await getPublishedBySlug("project", TEST_SLUG);
    expect(published?.title).toBe("Test Integration Project");
  });

  it("publishing a slug change registers a redirect", async () => {
    await updateContent({
      actor: admin,
      id: contentId,
      draft: projectDraft({ slug: TEST_SLUG_2 }),
      expectedVersion: 3,
    });
    const published = await publishContent(admin, contentId);
    expect(published.slug).toBe(TEST_SLUG_2);

    const redirects = await getSettingsValue("redirects");
    expect(
      redirects.entries.some(
        (entry) =>
          entry.from === `/projects/${TEST_SLUG}` &&
          entry.to === `/projects/${TEST_SLUG_2}`,
      ),
    ).toBe(true);
  });

  it("unpublishing removes all public references", async () => {
    const row = await unpublishContent(admin, contentId);
    expect(row.status).toBe("draft");
    expect(await getPublishedBySlug("project", TEST_SLUG_2)).toBeNull();
    const published = await listPublished("project");
    expect(published.find((item) => item.id === contentId)).toBeUndefined();
  });

  it("enquiry managers cannot edit content", async () => {
    await expect(
      createContent({
        actor: enquiryManager,
        type: "news",
        draft: projectDraft(),
      }),
    ).rejects.toMatchObject({ kind: "forbidden" } as Partial<AppError>);
  });

  it("publish rejects forbidden dash characters stored in a draft", async () => {
    // Insert the row directly so only the publish-time guard is exercised.
    const inserted = await db
      .insert(content)
      .values({
        type: "project",
        slug: "test-integration-dash",
        title: "Fine title",
        excerpt: "",
        body: [],
        draft: projectDraft({
          slug: "test-integration-dash",
          body: [paragraph("Bad \u2013 dash body.")],
        }),
        status: "draft",
        metadata: {},
        createdById: admin.id,
        updatedById: admin.id,
        version: 1,
      })
      .returning();

    const dashRow = inserted[0];
    if (!dashRow) throw new Error("insert failed");
    await expect(publishContent(admin, dashRow.id)).rejects.toMatchObject({
      kind: "validation",
    } as Partial<AppError>);
    await archiveContent(admin, dashRow.id);
    await deleteContent(admin, dashRow.id);
  });

  it("publish rejects references to unpublished media", async () => {
    const inserted = await db
      .insert(media)
      .values({
        storageKey: `${uuid()}.jpg`,
        storageProvider: "local",
        mimeType: "image/jpeg",
        sizeBytes: 100,
        width: 10,
        height: 10,
        altText: "integration-test-draft-media",
        status: "draft",
        uploaderId: admin.id,
      })
      .returning();
    const insertedRow = inserted[0];
    if (!insertedRow) throw new Error("insert failed");

    const row = await createContent({
      actor: admin,
      type: "project",
      draft: projectDraft({
        slug: "test-integration-media-guard",
        body: [
          paragraph("Body."),
          {
            id: uuid(),
            type: "image",
            mediaId: insertedRow.id,
            alt: "Draft image",
          },
        ],
      }),
    });
    await expect(publishContent(admin, row.id)).rejects.toMatchObject({
      kind: "validation",
    } as Partial<AppError>);
    await archiveContent(admin, row.id);
    await deleteContent(admin, row.id);
    await db.delete(media).where(eq(media.id, insertedRow.id));
  });

  it("deleting requires archiving first", async () => {
    const row = await createContent({
      actor: admin,
      type: "project",
      draft: projectDraft({ slug: "test-integration-delete-guard" }),
    });
    await expect(deleteContent(admin, row.id)).rejects.toMatchObject({
      kind: "conflict",
    } as Partial<AppError>);
    await archiveContent(admin, row.id);
    await deleteContent(admin, row.id);
    expect(
      await getPublishedBySlug("project", "test-integration-delete-guard"),
    ).toBeNull();
  });

  it("stores an audit trail for every lifecycle step", async () => {
    const rows = await db
      .select({ action: auditLog.action, entityId: auditLog.entityId })
      .from(auditLog)
      .where(eq(auditLog.entityId, contentId));
    const actions = rows.map((row) => row.action);
    expect(actions).toContain("content.create");
    expect(actions).toContain("content.update");
    expect(actions).toContain("content.publish");
    expect(actions).toContain("content.unpublish");
  });
});

describe("enquiry storage", () => {
  const key = uuid();

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      name: "Integration Tester",
      organisation: "",
      email: `tester${TEST_DOMAIN}`,
      telephone: "+254 700 000 002",
      serviceInterest: "Electrical and Automation Engineering",
      message: "An automated integration test enquiry message.",
      privacyAccepted: true,
      privacyVersion: "1.0",
      idempotencyKey: key,
      companyWebsite: "",
      turnstileToken: "",
      ...overrides,
    };
  }

  it("stores a valid enquiry exactly once across retries", async () => {
    const parsed = enquiryPayloadSchema.parse(payload()) as EnquiryPayload;
    const first = await createEnquiry({
      payload: parsed,
      privacyVersion: "1.0",
    });
    expect(first.created).toBe(true);
    expect(first.row.publicRef).toMatch(/^ENQ-[A-Z0-9]{6}$/);

    const retry = await createEnquiry({
      payload: parsed,
      privacyVersion: "1.0",
    });
    expect(retry.created).toBe(false);
    expect(retry.row.id).toBe(first.row.id);
  });

  it("keeps the enquiry when notification fails and flags it", async () => {
    // Enable the notification path temporarily so the failure is recorded.
    process.env.RESEND_API_KEY = "re_test_not_a_real_key";
    process.env.EMAIL_FROM = "website@lalicaengineering.com";
    process.env.EMAIL_TO = "enquiries@lalicaengineering.com";
    try {
      const parsed = enquiryPayloadSchema.parse(
        payload({
          email: `failing${TEST_DOMAIN}`,
          idempotencyKey: uuid(),
        }),
      ) as EnquiryPayload;
      const result = await createEnquiry({
        payload: parsed,
        privacyVersion: "1.0",
        emailTransport: async () => {
          throw new Error("smtp down");
        },
      });
      expect(result.created).toBe(true);
      expect(result.row.notificationStatus).toBe("failed");

      const stored = await db
        .select({
          id: enquiries.id,
          notificationStatus: enquiries.notificationStatus,
        })
        .from(enquiries)
        .where(eq(enquiries.email, `failing${TEST_DOMAIN}`));
      expect(stored).toHaveLength(1);
      expect(stored[0]?.notificationStatus).toBe("failed");
    } finally {
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;
      delete process.env.EMAIL_TO;
    }
  });

  it("exposes enquiries only to roles with permission", async () => {
    await expect(
      listEnquiries({ actor: enquiryManager, page: 1, pageSize: 10 }),
    ).resolves.toBeTruthy();
    await expect(
      listEnquiries({ actor: editor, page: 1, pageSize: 10 }),
    ).rejects.toMatchObject({ kind: "forbidden" } as Partial<AppError>);
  });
});

describe("user management guards", () => {
  it("blocks deactivating the last active administrator", async () => {
    await expect(
      setUserActive({ actor: admin, userId: admin.id, active: false }),
    ).rejects.toMatchObject({ kind: "conflict" } as Partial<AppError>);
  });

  it("blocks demoting the last active administrator", async () => {
    await expect(
      setUserRole({ actor: admin, userId: admin.id, role: "editor" }),
    ).rejects.toMatchObject({ kind: "conflict" } as Partial<AppError>);
  });

  it("blocks role changes by editors", async () => {
    await expect(
      setUserRole({ actor: editor, userId: admin.id, role: "editor" }),
    ).rejects.toMatchObject({ kind: "forbidden" } as Partial<AppError>);
  });
});

describe("settings service", () => {
  it("blocks settings writes by non-administrators", async () => {
    await expect(
      setSettingsValue({ actor: editor, key: "homepage", value: {} }),
    ).rejects.toMatchObject({ kind: "forbidden" } as Partial<AppError>);
  });

  it("allows administrators to write and read settings", async () => {
    const original = await getSettingsValue("homepage");
    await setSettingsValue({
      actor: admin,
      key: "homepage",
      value: { heroTitle: "Integration test title." },
    });
    const read = await getSettingsValue("homepage");
    expect(read.heroTitle).toBe("Integration test title.");
    // Restore the verified copy used by the public site.
    await setSettingsValue({ actor: admin, key: "homepage", value: original });
  });
});

describe("media authorisation", () => {
  it("rejects unsupported upload types", async () => {
    await expect(
      authorizeUpload({ actor: admin, mimeType: "image/svg+xml" }),
    ).rejects.toMatchObject({ kind: "bad_request" } as Partial<AppError>);
    await expect(
      authorizeUpload({ actor: admin, mimeType: "application/pdf" }),
    ).rejects.toMatchObject({ kind: "bad_request" } as Partial<AppError>);
  });

  it("rejects upload authorisation for enquiry managers", async () => {
    await expect(
      authorizeUpload({ actor: enquiryManager, mimeType: "image/png" }),
    ).rejects.toMatchObject({ kind: "forbidden" } as Partial<AppError>);
  });

  it("issues a signed local ticket for staff with permission", async () => {
    const auth = await authorizeUpload({ actor: editor, mimeType: "image/webp" });
    expect(auth.mode).toBe("local");
    expect(auth.ticket).toBeTruthy();
  });
});

describe("submission flow", () => {
  it("moves a draft to in_review and lets an administrator publish from review", async () => {
    const row = await createContent({
      actor: editor,
      type: "project",
      draft: projectDraft({ slug: "test-integration-review" }),
    });
    const reviewed = await submitForReview(editor, row.id);
    expect(reviewed.status).toBe("in_review");

    const published = await publishContent(admin, row.id);
    expect(published.status).toBe("published");

    await unpublishContent(admin, row.id);
    await archiveContent(admin, row.id);
    await deleteContent(admin, row.id);
  });
});
