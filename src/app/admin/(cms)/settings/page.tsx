import { requireAdminPage } from "@/lib/auth/session";
import { getSettingsValue } from "@/lib/settings/service";
import {
  SETTINGS_KEYS,
  SETTINGS_KEY_LABELS,
  type SettingsKey,
} from "@/lib/settings/schemas";
import { SettingsSectionForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsAdminPage() {
  await requireAdminPage(["administrator"]);

  const values = await Promise.all(
    SETTINGS_KEYS.map(async (key) => ({
      key,
      value: await getSettingsValue(key),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
        Company settings
      </h1>
      <p className="mt-1 text-sm leading-6 text-ink-500">
        Settings apply immediately to the public site. Changes here trigger
        cache refreshes. Only publish what the company has verified.
      </p>

      <nav aria-label="Settings sections" className="mt-6 flex flex-wrap gap-2">
        {values.map(({ key }) => (
          <a
            key={key}
            href={`#settings-${key}`}
            className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 transition-soft hover:bg-brand-50"
          >
            {SETTINGS_KEY_LABELS[key]}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {values.map(({ key, value }) => (
          <SettingsSectionForm
            key={key}
            settingsKey={key as SettingsKey}
            label={SETTINGS_KEY_LABELS[key]}
            initialValue={value}
          />
        ))}
      </div>
    </div>
  );
}
