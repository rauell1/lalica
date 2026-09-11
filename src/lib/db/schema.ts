/**
 * Application database schema (PostgreSQL, Drizzle ORM).
 *
 * Six application tables: users, content, site_settings, enquiries, media,
 * audit_log. Authentication adds session, account, and verification tables
 * required by Better Auth, so the deployed database has nine tables in
 * total. All timestamps are stored in UTC.
 */

import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "editor",
  "enquiry_manager",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "service",
  "project",
  "csr_story",
  "news",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "published",
  "archived",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "new",
  "in_progress",
  "resolved",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "disabled",
]);

export const mediaStatusEnum = pgEnum("media_status", ["draft", "published"]);

/* ------------------------------------------------------------------ */
/* Application tables                                                 */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  /** Identity provider subject, for example "google:123456789". */
  subject: text("subject").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role"),
  /** Staff accounts are inactive until an administrator activates them. */
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const content = pgTable(
  "content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: contentTypeEnum("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    /** The validated structured body of the currently published version. */
    body: jsonb("body").notNull().$type<unknown>().default([]),
    /** The editable draft payload (title, slug, body, metadata, SEO). */
    draft: jsonb("draft").notNull().$type<unknown>(),
    /** Frozen copy of the draft at the moment of the last publish. */
    publishedSnapshot: jsonb("published_snapshot").$type<unknown>(),
    status: contentStatusEnum("status").notNull().default("draft"),
    coverMediaId: uuid("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Structured, type specific metadata validated as JSONB. */
    metadata: jsonb("metadata").notNull().$type<unknown>().default({}),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    updatedById: text("updated_by_id")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Optimistic concurrency control version. */
    version: integer("version").notNull().default(1),
  },
  (table) => [
    uniqueIndex("content_type_slug_idx").on(table.type, table.slug),
    index("content_type_status_idx").on(table.type, table.status),
  ],
);

export const siteSettings = pgTable("site_settings", {
  /** Named record, one of the keys in src/lib/settings/schemas.ts. */
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedById: text("updated_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicRef: text("public_ref").notNull().unique(),
    name: text("name").notNull(),
    organisation: text("organisation"),
    email: text("email").notNull(),
    telephone: text("telephone"),
    serviceInterest: text("service_interest").notNull(),
    message: text("message").notNull(),
    privacyVersion: text("privacy_version").notNull(),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Client generated token so retries cannot create duplicates. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: enquiryStatusEnum("status").notNull().default("new"),
    assignedToId: text("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notificationStatus: notificationStatusEnum("notification_status")
      .notNull()
      .default("pending"),
    notificationError: text("notification_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("enquiries_status_idx").on(table.status),
    index("enquiries_created_at_idx").on(table.createdAt),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Storage key or pathname inside the managed store (never raw bytes). */
    storageKey: text("storage_key").notNull(),
    /** "local" in development demos, "blob" with Vercel Blob. */
    storageProvider: text("storage_provider").notNull().default("local"),
    /** Public URL for blob backed files, null while still private. */
    publicUrl: text("public_url"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text").notNull().default(""),
    caption: text("caption"),
    /** Where the image came from and any rights information. */
    sourceNote: text("source_note"),
    /** "cleared", "unconfirmed" or "illustrative". */
    rightsStatus: text("rights_status").notNull().default("unconfirmed"),
    status: mediaStatusEnum("status").notNull().default("draft"),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("media_status_idx").on(table.status)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /** Minimal change metadata. Never secrets, tokens, or message bodies. */
    metadata: jsonb("metadata").notNull().$type<unknown>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_created_at_idx").on(table.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                 */
/* ------------------------------------------------------------------ */

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .$type<Date>(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Shared TypeScript types                                            */
/* ------------------------------------------------------------------ */

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type EnquiryStatus = (typeof enquiryStatusEnum.enumValues)[number];
export type NotificationStatus =
  (typeof notificationStatusEnum.enumValues)[number];
export type MediaStatus = (typeof mediaStatusEnum.enumValues)[number];

export const CONTENT_TYPES = contentTypeEnum.enumValues;
export const ROLES = userRoleEnum.enumValues;
