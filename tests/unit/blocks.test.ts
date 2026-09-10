import { describe, expect, it } from "vitest";

import {
  bodySchema,
  newCalloutBlock,
  newDividerBlock,
  newHeadingBlock,
  newImageBlock,
  newListBlock,
  newParagraphBlock,
  newQuoteBlock,
} from "@/lib/content/blocks";

describe("rich text block schema", () => {
  it("accepts exactly the seven supported block types", () => {
    const body = [
      newHeadingBlock(),
      newParagraphBlock(),
      newListBlock(),
      newQuoteBlock(),
      newCalloutBlock(),
      newImageBlock("00000000-0000-4000-8000-000000000001", "Alt text"),
      newDividerBlock(),
    ].map((block) => {
      if (block.type === "heading") return { ...block, text: "A heading" };
      if (block.type === "paragraph") return { ...block, text: "A paragraph." };
      if (block.type === "list") return { ...block, items: ["One", "Two"] };
      if (block.type === "quote") return { ...block, text: "A quote." };
      if (block.type === "callout") return { ...block, text: "A callout." };
      return block;
    });
    const result = bodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("rejects unknown block types and raw HTML payloads", () => {
    const bad = bodySchema.safeParse([
      { id: crypto.randomUUID(), type: "html", html: "<script>alert(1)</script>" },
    ]);
    expect(bad.success).toBe(false);

    // Plain text may contain angle brackets; they are inert escaped text,
    // never parsed as HTML.
    const nested = bodySchema.safeParse([
      { id: crypto.randomUUID(), type: "paragraph", text: "<img src=x onerror=alert(1)>" },
    ]);
    expect(nested.success).toBe(true);
  });

  it("strips smuggled extra fields so they are never stored", () => {
    const result = bodySchema.safeParse([
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        text: "Fine",
        dangerouslySetInnerHTML: "<script>alert(1)</script>",
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).not.toHaveProperty("dangerouslySetInnerHTML");
      expect(result.data[0]).toHaveProperty("type", "paragraph");
    }
  });

  it("rejects en dashes in block text", () => {
    const result = bodySchema.safeParse([
      { id: crypto.randomUUID(), type: "paragraph", text: "Bad \u2013 dash" },
    ]);
    expect(result.success).toBe(false);
    const message = JSON.stringify(result.error?.issues ?? []);
    expect(message).toContain("en dash");
  });

  it("enforces the 60 block ceiling", () => {
    const many = Array.from({ length: 61 }, () => ({
      id: crypto.randomUUID(),
      type: "divider" as const,
    }));
    expect(bodySchema.safeParse(many).success).toBe(false);
  });

  it("requires a uuid media id for image blocks", () => {
    const result = bodySchema.safeParse([
      { id: crypto.randomUUID(), type: "image", mediaId: "not-a-uuid", alt: "Alt" },
    ]);
    expect(result.success).toBe(false);
  });
});
