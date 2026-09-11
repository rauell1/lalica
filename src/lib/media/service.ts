/**
 * Media library service.
 *
 * Uploads go to managed object storage (Vercel Blob in production) or a
 * local development directory for demos. Files are verified by signature,
 * size, and dimensions before they are accepted; arbitrary SVG and
 * document uploads are disabled until a safe validation path is added.
 * Draft media stays access-controlled until published.
 */

import { createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  del as deleteBlob,
  get as getBlob,
  head as headBlob,
} from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import sharp, { type Sharp } from "sharp";

import { content, getPublicDb, runAsActor, media, type MediaStatus } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  assertPermission,
  hasPermission,
  type SessionUser,
} from "@/lib/auth/roles";
import { getServerEnv, isProduction } from "@/lib/env";
import { writeAudit } from "@/lib/audit/service";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export interface MediaRow {
  id: string;
  storageKey: string;
  storageProvider: string;
  publicUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string;
  caption: string | null;
  sourceNote: string | null;
  rightsStatus: string;
  status: MediaStatus;
  uploaderId: string;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */

function magicBytesFor(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.subarray(1, 4).toString("ascii") === "PNG"
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new AppError(
        "bad_request",
        "Unsupported file type. Upload JPEG, PNG, or WebP images only.",
      );
  }
}

async function validateImageBuffer(buffer: Buffer, declaredMime: string) {
  if (buffer.length === 0) {
    throw new AppError("bad_request", "The uploaded file is empty.");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new AppError(
      "bad_request",
      "The uploaded image is larger than the 10 MB limit.",
    );
  }
  const detected = magicBytesFor(buffer);
  if (!detected) {
    throw new AppError(
      "bad_request",
      "The file content is not a recognised JPEG, PNG, or WebP image.",
    );
  }
  if (detected !== declaredMime) {
    throw new AppError(
      "bad_request",
      "The file content does not match its declared type.",
    );
  }
}

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

/** Re-encode through sharp: strips embedded metadata and fixes orientation. */
export async function processImage(
  input: Buffer,
  mimeType: string,
): Promise<ProcessedImage> {
  await validateImageBuffer(input, mimeType);
  const base = sharp(input, { failOn: "error" }).rotate();
  let output: Sharp;
  switch (mimeType) {
    case "image/jpeg":
      output = base.jpeg({ quality: 88, mozjpeg: true });
      break;
    case "image/png":
      output = base.png({ compressionLevel: 9 });
      break;
    case "image/webp":
      output = base.webp({ quality: 88 });
      break;
    default:
      throw new AppError("bad_request", "Unsupported file type.");
  }
  const { data, info } = await output.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    mimeType,
    width: info.width,
    height: info.height,
  };
}

/* ------------------------------------------------------------------ */
/* Upload authorisation                                               */
/* ------------------------------------------------------------------ */

export interface UploadAuthorization {
  mode: "client" | "local";
  pathname?: string;
  token?: string;
  ticket?: string;
}

function signTicket(payload: Record<string, unknown>): string {
  const env = getServerEnv();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.authSecret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyTicket(ticket: string): Record<string, unknown> | null {
  const env = getServerEnv();
  const [body, signature] = ticket.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", env.authSecret)
    .update(body)
    .digest("base64url");
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (payload.purpose !== "media-upload") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function authorizeUpload(input: {
  actor: SessionUser;
  mimeType: string;
}): Promise<UploadAuthorization> {
  assertPermission(input.actor.role, "canUploadMedia");
  if (!ALLOWED_IMAGE_TYPES.includes(input.mimeType as never)) {
    throw new AppError(
      "bad_request",
      "Unsupported file type. Upload JPEG, PNG, or WebP images only.",
    );
  }

  await enforceLimit(
    "uploadAuthorize",
    hashIdentifier("uploadAuthorize", `user:${input.actor.id}`),
  );

  const env = getServerEnv();
  const pathname = `media/${randomUUID()}.${extensionForMime(input.mimeType)}`;

  if (env.blobReadWriteToken) {
    const token = await generateClientTokenFromReadWriteToken({
      token: env.blobReadWriteToken,
      pathname,
      validUntil: Date.now() + 10 * 60 * 1000,
      maximumSizeInBytes: MAX_UPLOAD_BYTES,
      allowedContentTypes: [input.mimeType],
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return { mode: "client", pathname, token };
  }

  if (!isProduction()) {
    const ticket = signTicket({
      purpose: "media-upload",
      userId: input.actor.id,
      mimeType: input.mimeType,
      exp: Date.now() + 10 * 60 * 1000,
    });
    return { mode: "local", ticket };
  }

  throw new AppError(
    "service_unavailable",
    "Media storage is not configured. Set BLOB_READ_WRITE_TOKEN (Vercel Blob) and redeploy.",
  );
}

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */

export function localMediaRoot(): string {
  return path.join(process.cwd(), "storage", "media");
}

const SAFE_KEY_PATTERN = /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/;

async function writeLocalFile(storageKey: string, buffer: Buffer): Promise<void> {
  if (!SAFE_KEY_PATTERN.test(storageKey)) {
    throw new AppError("bad_request", "Invalid storage key.");
  }
  const dir = localMediaRoot();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storageKey), buffer);
}

export async function readLocalFile(storageKey: string): Promise<Buffer> {
  if (!SAFE_KEY_PATTERN.test(storageKey)) {
    throw new AppError("bad_request", "Invalid storage key.");
  }
  try {
    return await readFile(path.join(localMediaRoot(), storageKey));
  } catch {
    throw new AppError("not_found", "This image is no longer available.");
  }
}

async function deleteLocalFile(storageKey: string): Promise<void> {
  if (!SAFE_KEY_PATTERN.test(storageKey)) return;
  await unlink(path.join(localMediaRoot(), storageKey)).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Media rows                                                         */
/* ------------------------------------------------------------------ */

export interface MediaUploadMeta {
  altText: string;
  caption?: string;
  sourceNote?: string;
  rightsStatus?: "cleared" | "unconfirmed" | "illustrative";
}

async function insertMediaRow(input: {
  actor: SessionUser;
  storageKey: string;
  storageProvider: "local" | "blob";
  publicUrl?: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  meta: MediaUploadMeta;
}): Promise<MediaRow> {
  const inserted = await runAsActor(input.actor.id, (db) =>
    db
      .insert(media)
      .values({
        storageKey: input.storageKey,
        storageProvider: input.storageProvider,
        publicUrl: input.publicUrl ?? null,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        altText: input.meta.altText,
        caption: input.meta.caption || null,
        sourceNote: input.meta.sourceNote || null,
        rightsStatus: input.meta.rightsStatus ?? "unconfirmed",
        status: "draft",
        uploaderId: input.actor.id,
      })
      .returning(),
  );
  const row = inserted[0] as MediaRow;
  await writeAudit({
    actorId: input.actor.id,
    action: "media.upload",
    entityType: "media",
    entityId: row.id,
    metadata: { storageKey: row.storageKey, mimeType: row.mimeType },
  });
  return row;
}

export async function completeLocalUpload(input: {
  actor: SessionUser;
  ticket: string;
  buffer: Buffer;
  mimeType: string;
  meta: MediaUploadMeta;
}): Promise<MediaRow> {
  assertPermission(input.actor.role, "canUploadMedia");
  const ticketPayload = verifyTicket(input.ticket);
  if (!ticketPayload) {
    throw new AppError(
      "bad_request",
      "This upload authorisation has expired. Please try the upload again.",
    );
  }
  if (ticketPayload.mimeType !== input.mimeType) {
    throw new AppError("bad_request", "The upload does not match its authorisation.");
  }

  const processed = await processImage(input.buffer, input.mimeType);
  const storageKey = `${randomUUID()}.${extensionForMime(input.mimeType)}`;
  await writeLocalFile(storageKey, processed.buffer);
  return insertMediaRow({
    actor: input.actor,
    storageKey,
    storageProvider: "local",
    mimeType: processed.mimeType,
    sizeBytes: processed.buffer.length,
    width: processed.width,
    height: processed.height,
    meta: input.meta,
  });
}

export async function completeBlobUpload(input: {
  actor: SessionUser;
  pathname: string;
  url: string;
  mimeType: string;
  meta: MediaUploadMeta;
}): Promise<MediaRow> {
  assertPermission(input.actor.role, "canUploadMedia");
  const pathname = input.pathname;
  if (!SAFE_KEY_PATTERN.test(pathname) || !pathname.startsWith("media/")) {
    throw new AppError("bad_request", "Invalid upload path.");
  }
  const env = getServerEnv();
  const urlObject = new URL(input.url);
  const allowedHosts = new Set<string>(["public.blob.vercel-storage.com"]);
  if (!allowedHosts.has(urlObject.hostname) && !urlObject.hostname.endsWith(".public.blob.vercel-storage.com")) {
    throw new AppError("bad_request", "The upload URL is not from the configured storage.");
  }
  if (!input.url.startsWith(urlObject.origin) || !urlObject.pathname.endsWith(`/${pathname}`)) {
    throw new AppError("bad_request", "The upload URL does not match its authorisation.");
  }
  if (urlObject.username || urlObject.password) {
    throw new AppError("bad_request", "The upload URL is invalid.");
  }

  // Server side verification of the stored object: signature, size, and
  // dimensions. This also strips metadata before the image can be used.
  const stored = await headBlob(pathname, { token: env.blobReadWriteToken });
  if (!stored || stored.size > MAX_UPLOAD_BYTES) {
    throw new AppError("bad_request", "The uploaded object could not be verified.");
  }
  const fetched = await getBlob(pathname, {
    token: env.blobReadWriteToken,
    access: "public",
  });
  if (!fetched || !fetched.stream) {
    throw new AppError("bad_request", "The uploaded object could not be verified.");
  }
  const buffer = Buffer.from(await new Response(fetched.stream).arrayBuffer());
  const processed = await processImage(buffer, input.mimeType);

  // Replace the stored object with the metadata-stripped derivative.
  await deleteBlob(pathname, { token: env.blobReadWriteToken }).catch(() => undefined);
  const { put } = await import("@vercel/blob");
  const replacement = await put(pathname, processed.buffer, {
    access: "public",
    contentType: processed.mimeType,
    token: env.blobReadWriteToken,
  });

  return insertMediaRow({
    actor: input.actor,
    storageKey: pathname,
    storageProvider: "blob",
    publicUrl: replacement.url,
    mimeType: processed.mimeType,
    sizeBytes: processed.buffer.length,
    width: processed.width,
    height: processed.height,
    meta: input.meta,
  });
}

/* ------------------------------------------------------------------ */
/* Library                                                            */
/* ------------------------------------------------------------------ */

export async function listMedia(input: {
  actor: SessionUser;
  q?: string;
  page: number;
  pageSize: number;
}) {
  assertPermission(input.actor.role, "canUploadMedia");
  const conditions: SQL[] = [];
  if (input.q) {
    conditions.push(
      or(ilike(media.altText, `%${input.q}%`), ilike(media.storageKey, `%${input.q}%`))!,
    );
  }
  return runAsActor(input.actor.id, async (db) => {
    const rows = await db
      .select()
      .from(media)
      .where(and(...conditions))
      .orderBy(desc(media.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(media)
      .where(and(...conditions));
    return { rows: rows as MediaRow[], total: countRows[0]?.count ?? 0 };
  });
}

export async function getMedia(actor: SessionUser, id: string): Promise<MediaRow> {
  assertPermission(actor.role, "canUploadMedia");
  const row = await runAsActor(actor.id, async (db) => {
    const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return rows[0];
  });
  if (!row) throw new AppError("not_found", "This image does not exist.");
  return row as MediaRow;
}

export async function updateMedia(input: {
  actor: SessionUser;
  id: string;
  altText: string;
  caption?: string;
  sourceNote?: string;
  rightsStatus?: "cleared" | "unconfirmed" | "illustrative";
}): Promise<MediaRow> {
  assertPermission(input.actor.role, "canUploadMedia");
  await getMedia(input.actor, input.id);
  const updated = await runAsActor(input.actor.id, (db) =>
    db
      .update(media)
      .set({
        altText: input.altText,
        caption: input.caption || null,
        sourceNote: input.sourceNote || null,
        rightsStatus: input.rightsStatus ?? "unconfirmed",
      })
      .where(eq(media.id, input.id))
      .returning(),
  );
  return updated[0] as MediaRow;
}

export async function setMediaStatus(
  actor: SessionUser,
  id: string,
  status: MediaStatus,
): Promise<MediaRow> {
  assertPermission(actor.role, "canUploadMedia");
  const existing = await getMedia(actor, id);
  if (status === "published" && !existing.altText.trim()) {
    throw new AppError(
      "validation",
      "Add descriptive alt text before publishing this image.",
    );
  }
  const updated = await runAsActor(actor.id, (db) =>
    db
      .update(media)
      .set({ status })
      .where(eq(media.id, id))
      .returning(),
  );
  await writeAudit({
    actorId: actor.id,
    action: status === "published" ? "media.publish" : "media.unpublish",
    entityType: "media",
    entityId: id,
  });
  return updated[0] as MediaRow;
}

export async function deleteMedia(actor: SessionUser, id: string): Promise<void> {
  assertPermission(actor.role, "canUploadMedia");
  const existing = await getMedia(actor, id);

  // Refuse deletion while any content item references the image.
  await runAsActor(actor.id, async (db) => {
    const referencing = await db
      .select({ id: content.id, title: content.title })
      .from(content)
      .where(
        or(
          eq(content.coverMediaId, id),
          sql`${content.draft}::text ilike ${`%${id}%`}`,
          sql`${content.publishedSnapshot}::text ilike ${`%${id}%`}`,
        )!,
      )
      .limit(1);
    if (referencing[0]) {
      throw new AppError(
        "conflict",
        `This image is used by "${referencing[0].title}". Remove it from the content item first.`,
      );
    }

    await db.delete(media).where(eq(media.id, id));
  });

  if (existing.storageProvider === "local") {
    await deleteLocalFile(existing.storageKey);
  } else {
    const env = getServerEnv();
    await deleteBlob(existing.storageKey, { token: env.blobReadWriteToken }).catch(
      () => undefined,
    );
  }

  await writeAudit({
    actorId: actor.id,
    action: "media.delete",
    entityType: "media",
    entityId: id,
    metadata: { storageKey: existing.storageKey },
  });
}

/** Media ids referenced by a published content body, resolved for rendering. */
export async function resolveMediaForRender(
  actor: SessionUser | null,
  ids: string[],
): Promise<Map<string, MediaRow>> {
  if (ids.length === 0) return new Map();
  const rows = actor
    ? await runAsActor(actor.id, (db) =>
        db.select().from(media).where(inArray(media.id, ids)),
      )
    : await getPublicDb()
        .select()
        .from(media)
        .where(inArray(media.id, ids));
  const out = new Map<string, MediaRow>();
  for (const row of rows) {
    const typed = row as MediaRow;
    if (typed.status === "published" || (actor && hasPermission(actor.role, "canUploadMedia"))) {
      out.set(typed.id, typed);
    }
  }
  return out;
}
