/**
 * Cached settings reads used by the web application.
 */

import { cachedPublic, CACHE_TAG_SETTINGS } from "@/lib/cache";
import { getSettingsValue } from "./service";
import type { SettingsKey } from "./schemas";

export function getSettingsCached<K extends SettingsKey>(key: K) {
  return cachedPublic(
    () => getSettingsValue(key),
    ["settings", key],
    [CACHE_TAG_SETTINGS, `${CACHE_TAG_SETTINGS}:${key}`],
  );
}
