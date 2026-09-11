/**
 * Content types, metadata shapes, and draft payload validation.
 *
 * Projects and CSR stories keep their type specific fields in validated
 * JSONB metadata rather than separate tables, matching the lightweight
 * database design.
 */

import { z } from "zod";

import { bodySchema, collectBodyMediaIds, type Body } from "./blocks";
import {
  dashViolationMessage,
  findDashViolations,
  SLUG_PATTERN,
} from "@/lib/utils/text";
import type { ContentType } from "@/lib/db";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  service: "Service",
  project: "Project",
  csr_story: "CSR story",
  news: "News article",
};

export const CONTENT_TYPE_PUBLIC_BASE: Record<ContentType, string> = {
  service: "/services",
  project: "/projects",
  csr_story: "/csr",
  news: "/news",
};

/* ------------------------------------------------------------------ */
/* Type specific metadata                                             */
/* ------------------------------------------------------------------ */

export const SERVICE_GROUPS = [
  "electrical_automation",
  "mechanical",
  "refrigeration_hvac",
] as const;

export type ServiceGroup = (typeof SERVICE_GROUPS)[number];

export const SERVICE_GROUP_LABELS: Record<ServiceGroup, string> = {
  electrical_automation: "Electrical and Automation Engineering",
  mechanical: "Mechanical Engineering",
  refrigeration_hvac: "Refrigeration and HVAC Solutions",
};

export const serviceMetadataSchema = z.object({
  serviceGroup: z.enum(SERVICE_GROUPS),
  order: z.number().int().min(0).max(99),
});

export type ServiceMetadata = z.infer<typeof serviceMetadataSchema>;

const monthPattern = /^\d{4}-\d{2}$/;

export const projectMetadataSchema = z.object({
  sector: z.string().trim().min(1).max(80),
  location: z.string().trim().min(1).max(120),
  clientDisplay: z.enum(["named", "anonymous", "none"]),
  clientName: z.string().trim().max(120).optional().default(""),
  status: z.enum(["completed", "ongoing"]),
  startDate: z
    .string()
    .regex(monthPattern, "Use the YYYY-MM format, for example 2025-03.")
    .optional()
    .or(z.literal("")),
  endDate: z
    .string()
    .regex(monthPattern, "Use the YYYY-MM format, for example 2025-08.")
    .optional()
    .or(z.literal("")),
  challenge: z.string().trim().max(2000).optional().default(""),
  solution: z.string().trim().max(2000).optional().default(""),
  outcomes: z.array(z.string().trim().min(1).max(300)).max(8).optional().default([]),
  relatedServices: z.array(z.string().trim().max(80)).max(6).optional().default([]),
  gallery: z.array(z.string().uuid()).max(12).optional().default([]),
});

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const impactMeasureSchema = z.object({
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(100),
  unit: z.string().trim().max(40).optional().default(""),
  evidence: z.string().trim().min(1).max(1000),
  methodology: z.string().trim().min(1).max(1000),
});

export const csrMetadataSchema = z.object({
  initiativeDate: z
    .string()
    .regex(isoDatePattern, "Use the YYYY-MM-DD format, for example 2025-03-14.")
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(120).optional().default(""),
  theme: z.string().trim().min(1).max(100),
  partners: z.array(z.string().trim().min(1).max(120)).max(10).optional().default([]),
  impactMeasures: z.array(impactMeasureSchema).max(8).optional().default([]),
  sdgs: z
    .array(
      z.object({
        number: z.number().int().min(1).max(17),
        note: z.string().trim().max(300).optional().default(""),
      }),
    )
    .max(8)
    .optional()
    .default([]),
  evidenceNotes: z.string().trim().max(2000).optional().default(""),
  gallery: z.array(z.string().uuid()).max(12).optional().default([]),
});

export type CsrMetadata = z.infer<typeof csrMetadataSchema>;

export const newsMetadataSchema = z.object({
  category: z.string().trim().max(60).optional().default(""),
});

export type NewsMetadata = z.infer<typeof newsMetadataSchema>;

/* ------------------------------------------------------------------ */
/* Draft payload                                                      */
/* ------------------------------------------------------------------ */

const cleanField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .superRefine((value, ctx) => {
      const violations = findDashViolations(value);
      if (violations.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: dashViolationMessage(violations),
        });
      }
    });

const slugField = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    SLUG_PATTERN,
    "Use lower case letters, numbers, and hyphens only, for example electrical-automation.",
  );

const baseDraftFields = {
  title: cleanField(120).min(2),
  slug: slugField,
  excerpt: cleanField(400).default(""),
  body: bodySchema,
  coverMediaId: z.string().uuid().nullable().default(null),
  seoTitle: cleanField(70).default(""),
  seoDescription: cleanField(180).default(""),
};

export const draftSchemaByType = {
  service: z.object({
    ...baseDraftFields,
    metadata: serviceMetadataSchema,
  }),
  project: z.object({
    ...baseDraftFields,
    metadata: projectMetadataSchema,
  }),
  csr_story: z.object({
    ...baseDraftFields,
    metadata: csrMetadataSchema,
  }),
  news: z.object({
    ...baseDraftFields,
    metadata: newsMetadataSchema,
  }),
} satisfies Record<ContentType, z.ZodType>;

export type ContentDraft<T extends ContentType = ContentType> = z.infer<
  (typeof draftSchemaByType)[T]
>;

/** Validate a draft payload for a content type and return typed data. */
export function parseDraft<T extends ContentType>(
  type: T,
  value: unknown,
): ContentDraft<T> {
  return draftSchemaByType[type].parse(value) as ContentDraft<T>;
}

export function draftFieldErrors<T extends ContentType>(
  type: T,
  value: unknown,
): Record<string, string[]> | null {
  const result = draftSchemaByType[type].safeParse(value);
  if (result.success) return null;
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] = out[key] ?? [];
    out[key].push(issue.message);
  }
  return out;
}

/** All media ids referenced anywhere in a draft payload. */
export function collectDraftMediaIds(draft: {
  body: Body;
  coverMediaId?: string | null;
  metadata?: unknown;
}): string[] {
  const ids = new Set<string>();
  for (const id of collectBodyMediaIds(draft.body)) ids.add(id);
  if (draft.coverMediaId) ids.add(draft.coverMediaId);
  const gallery = (draft.metadata as { gallery?: string[] } | undefined)?.gallery;
  for (const id of gallery ?? []) ids.add(id);
  return [...ids];
}
