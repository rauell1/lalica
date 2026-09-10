/**
 * Structured rich text block schema.
 *
 * CMS users compose content from a restricted set of typed blocks. The
 * blocks are stored as JSON and rendered server side into semantic HTML.
 * Arbitrary HTML, MDX, or JavaScript are never accepted or executed.
 */

import { z } from "zod";

import { dashViolationMessage, findDashViolations } from "@/lib/utils/text";

const text = (max: number) => z.string().trim().max(max);

const cleanText = (max: number) =>
  text(max).superRefine((value, ctx) => {
    const violations = findDashViolations(value);
    if (violations.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: dashViolationMessage(violations),
      });
    }
  });

const blockId = z.string().uuid();

export const headingBlockSchema = z.object({
  id: blockId,
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: cleanText(140).min(1),
});

export const paragraphBlockSchema = z.object({
  id: blockId,
  type: z.literal("paragraph"),
  text: cleanText(2000).min(1),
});

export const listBlockSchema = z.object({
  id: blockId,
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(cleanText(400).min(1)).min(1).max(20),
});

export const quoteBlockSchema = z.object({
  id: blockId,
  type: z.literal("quote"),
  text: cleanText(800).min(1),
  attribution: cleanText(120).optional().default(""),
});

export const calloutBlockSchema = z.object({
  id: blockId,
  type: z.literal("callout"),
  variant: z.enum(["info", "success", "warning"]),
  title: cleanText(100).optional().default(""),
  text: cleanText(1000).min(1),
});

export const imageBlockSchema = z.object({
  id: blockId,
  type: z.literal("image"),
  mediaId: z.string().uuid(),
  alt: cleanText(200).min(1),
  caption: cleanText(300).optional().default(""),
});

export const dividerBlockSchema = z.object({
  id: blockId,
  type: z.literal("divider"),
});

export const bodyBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  listBlockSchema,
  quoteBlockSchema,
  calloutBlockSchema,
  imageBlockSchema,
  dividerBlockSchema,
]);

export const bodySchema = z.array(bodyBlockSchema).max(60);

export type BodyBlock = z.infer<typeof bodyBlockSchema>;
export type Body = BodyBlock[];

/* Block factories used by the admin editor for new blocks. */

export function newParagraphBlock(): BodyBlock {
  return { id: crypto.randomUUID(), type: "paragraph", text: "" };
}

export function newHeadingBlock(): BodyBlock {
  return { id: crypto.randomUUID(), type: "heading", level: 2, text: "" };
}

export function newListBlock(): BodyBlock {
  return {
    id: crypto.randomUUID(),
    type: "list",
    ordered: false,
    items: [""],
  };
}

export function newQuoteBlock(): BodyBlock {
  return { id: crypto.randomUUID(), type: "quote", text: "", attribution: "" };
}

export function newCalloutBlock(): BodyBlock {
  return {
    id: crypto.randomUUID(),
    type: "callout",
    variant: "info",
    title: "",
    text: "",
  };
}

export function newImageBlock(mediaId: string, alt: string): BodyBlock {
  return { id: crypto.randomUUID(), type: "image", mediaId, alt, caption: "" };
}

export function newDividerBlock(): BodyBlock {
  return { id: crypto.randomUUID(), type: "divider" };
}

/** Collect every media id referenced by a body. */
export function collectBodyMediaIds(body: Body): string[] {
  const ids = new Set<string>();
  for (const block of body) {
    if (block.type === "image") ids.add(block.mediaId);
  }
  return [...ids];
}
