/**
 * Tagged data caching for public content.
 *
 * Public reads go through unstable_cache with a bounded time to live and
 * stable tags. Publishing, unpublishing, and settings changes invalidate
 * the affected tags (see invalidate.ts) so visitors see updated content
 * without a manual deployment. Private admin responses never pass through
 * these caches.
 */

import { unstable_cache } from "next/cache";

export const CACHE_REVALIDATE_SECONDS = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cachedPublic<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  tags: string[],
): T {
  return unstable_cache(
    fn as unknown as Parameters<typeof unstable_cache>[0],
    keyParts,
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags,
    },
  ) as unknown as T;
}

export const CACHE_TAG_CONTENT = "content";
export const CACHE_TAG_CONTENT_DETAIL = "content:detail";
export const CACHE_TAG_CONTENT_LIST = "content:list";
export const CACHE_TAG_SETTINGS = "settings";
