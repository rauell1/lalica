/**
 * Cache invalidation after publishing and settings changes.
 *
 * Called from server actions immediately after a successful mutation so
 * the public pages, sitemap, and metadata reflect the change without a
 * manual deployment. updateTag gives read-your-writes freshness inside
 * server actions; revalidateTag covers route handlers and background
 * revalidation.
 */

import { revalidatePath, revalidateTag, updateTag } from "next/cache";

import {
  CACHE_TAG_CONTENT,
  CACHE_TAG_CONTENT_DETAIL,
  CACHE_TAG_CONTENT_LIST,
  CACHE_TAG_SETTINGS,
} from "@/lib/cache";
import { CONTENT_TYPE_PUBLIC_BASE } from "@/lib/content/types";
import type { ContentType } from "@/lib/db";

function refreshTags(tags: string[]) {
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      // updateTag only works inside a server action; revalidateTag below
      // covers other call sites.
      break;
    }
  }
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}

export function invalidateContent(
  type: ContentType,
  slug?: string,
): void {
  const tags = [
    CACHE_TAG_CONTENT,
    CACHE_TAG_CONTENT_DETAIL,
    CACHE_TAG_CONTENT_LIST,
  ];
  refreshTags(tags);

  const base = CONTENT_TYPE_PUBLIC_BASE[type];
  revalidatePath(base);
  if (slug) revalidatePath(`${base}/${slug}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export function invalidateSettings(key?: string): void {
  const tags = [CACHE_TAG_SETTINGS];
  if (key) tags.push(`${CACHE_TAG_SETTINGS}:${key}`);
  refreshTags(tags);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/privacy");
  revalidatePath("/sitemap.xml");
}
