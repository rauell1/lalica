/**
 * Cached public content reads used by the web application.
 */

import {
  cachedPublic,
  CACHE_TAG_CONTENT,
  CACHE_TAG_CONTENT_DETAIL,
  CACHE_TAG_CONTENT_LIST,
} from "@/lib/cache";
import {
  countPublished,
  getHomepagePublished,
  getPublishedBySlug,
  listPublished,
} from "./service";
import type { ContentType } from "@/lib/db";

export const getPublishedBySlugCached = cachedPublic(
  (type: ContentType, slug: string) => getPublishedBySlug(type, slug),
  ["content", "published-by-slug"],
  [CACHE_TAG_CONTENT, CACHE_TAG_CONTENT_DETAIL],
);

export const listPublishedCached = cachedPublic(
  (type: ContentType, limit?: number, offset?: number) =>
    listPublished(type, { limit, offset }),
  ["content", "published-list"],
  [CACHE_TAG_CONTENT, CACHE_TAG_CONTENT_LIST],
);

export const countPublishedCached = cachedPublic(
  (type: ContentType) => countPublished(type),
  ["content", "published-count"],
  [CACHE_TAG_CONTENT, CACHE_TAG_CONTENT_LIST],
);

export const getHomepagePublishedCached = cachedPublic(
  () => getHomepagePublished(),
  ["content", "homepage"],
  [CACHE_TAG_CONTENT, CACHE_TAG_CONTENT_LIST],
);
