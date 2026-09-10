/**
 * Restricted rich text renderer.
 *
 * CMS content is stored as a typed block list and rendered into semantic
 * HTML here. Arbitrary HTML, Markdown, MDX, or executable content is never
 * accepted or rendered.
 */

import Image from "next/image";

import type { Body, BodyBlock } from "@/lib/content/blocks";
import type { MediaRow } from "@/lib/media/service";

export function ContentBlocks({
  body,
  media,
}: {
  body: Body;
  media: Map<string, MediaRow>;
}) {
  return (
    <div className="space-y-8">
      {body.map((block) => (
        <Block key={block.id} block={block} media={media} />
      ))}
    </div>
  );
}

function Block({
  block,
  media,
}: {
  block: BodyBlock;
  media: Map<string, MediaRow>;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = block.level === 2 ? "h2" : "h3";
      return (
        <Tag
          className={`font-[family-name:var(--font-display)] font-extrabold tracking-tight text-ink-900 ${
            block.level === 2 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      return <p className="leading-7 text-ink-700">{block.text}</p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`space-y-2 pl-6 leading-7 text-ink-700 ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, index) => (
            <li key={index} className="pl-1">
              {item}
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <figure className="border-l-4 border-accent-500 bg-surface px-6 py-5">
          <blockquote className="font-[family-name:var(--font-display)] text-lg leading-8 text-ink-900">
            {block.text}
          </blockquote>
          {block.attribution && (
            <figcaption className="mt-2 text-sm font-semibold text-ink-500">
              {block.attribution}
            </figcaption>
          )}
        </figure>
      );
    case "callout": {
      const tone =
        block.variant === "success"
          ? "border-green-300 bg-green-50"
          : block.variant === "warning"
            ? "border-accent-400 bg-accent-50"
            : "border-brand-200 bg-brand-50";
      return (
        <div className={`rounded-lg border px-6 py-5 ${tone}`}>
          {block.title && (
            <p className="font-[family-name:var(--font-display)] font-bold text-ink-900">
              {block.title}
            </p>
          )}
          <p className={`leading-7 text-ink-700 ${block.title ? "mt-1" : ""}`}>
            {block.text}
          </p>
        </div>
      );
    }
    case "image": {
      const row = media.get(block.mediaId);
      if (!row) return null;
      return (
        <figure>
          <div className="overflow-hidden rounded-lg border border-ink-100">
            <Image
              src={`/api/media/${row.id}`}
              alt={block.alt || row.altText}
              width={row.width ?? 1280}
              height={row.height ?? 720}
              sizes="(min-width: 1024px) 840px, 100vw"
              className="h-auto w-full"
            />
          </div>
          {(block.caption || row.caption) && (
            <figcaption className="mt-2 text-sm text-ink-500">
              {block.caption || row.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case "divider":
      return <hr className="border-ink-100" />;
  }
}
