"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  publishPrivacyAction,
  updateSettingsAction,
  type ActionResult,
} from "@/app/admin/actions";
import type { SettingsKey } from "@/lib/settings/schemas";

/* ------------------------------------------------------------------ */
/* Declarative field descriptors                                       */
/* ------------------------------------------------------------------ */

type FieldSpec =
  | {
      kind: "text" | "textarea" | "email" | "url" | "number";
      path: string;
      label: string;
      hint?: string;
      max?: number;
      rows?: number;
    }
  | {
      kind: "bool";
      path: string;
      label: string;
      hint?: string;
    }
  | {
      kind: "select";
      path: string;
      label: string;
      options: [string, string][];
      hint?: string;
    }
  | {
      kind: "stringList";
      path: string;
      label: string;
      hint?: string;
      placeholder?: string;
      max?: number;
    };

function getPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);
}

function setPath(
  value: Record<string, unknown>,
  path: string,
  next: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(value));
  let cursor: Record<string, unknown> = clone;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!part) continue;
    if (!cursor[part] || typeof cursor[part] !== "object") {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (last) cursor[last] = next;
  return clone;
}

function cloneValue(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Per-key field configuration                                         */
/* ------------------------------------------------------------------ */

const FIELD_SPECS: Record<string, FieldSpec[]> = {
  company: [
    { kind: "text", path: "name", label: "Company name", max: 120, hint: "The legal name as registered." },
    { kind: "text", path: "shortName", label: "Short name", max: 60 },
    { kind: "textarea", path: "description", label: "Company description", max: 1500, rows: 5 },
    { kind: "stringList", path: "priorities", label: "Priorities", hint: "Used in the Why choose Lalica panel. Keep to what the profile states.", max: 12, placeholder: "For example: Excellence" },
    { kind: "text", path: "addressLine", label: "Address", max: 160 },
    { kind: "text", path: "region", label: "Region", max: 80 },
    { kind: "text", path: "telephone", label: "Telephone (digits only)", max: 40 },
    { kind: "text", path: "telephoneDisplay", label: "Telephone display format", max: 60 },
    { kind: "email", path: "email", label: "Email" },
    { kind: "text", path: "websiteDisplay", label: "Printed website", max: 80, hint: "As printed in the profile. Ownership is verified separately during deployment." },
    { kind: "url", path: "locationSearchUrl", label: "Location search link", max: 300, hint: "A map search for the address. Leave empty to remove the link." },
  ],
  contacts: [
    { kind: "text", path: "telephone", label: "Telephone (digits only)", max: 40 },
    { kind: "text", path: "telephoneDisplay", label: "Telephone display format", max: 60 },
    { kind: "email", path: "email", label: "Email" },
    { kind: "text", path: "whatsappNumber", label: "WhatsApp number", max: 40, hint: "Leave empty until the company confirms a WhatsApp number. Never assume the telephone supports WhatsApp." },
    { kind: "bool", path: "whatsappConfirmed", label: "WhatsApp number confirmed", hint: "Switch on only after the company confirms the number in writing." },
    { kind: "text", path: "businessHours", label: "Business hours", max: 300, hint: "Empty until the company confirms opening hours." },
    { kind: "text", path: "addressLine", label: "Address", max: 160 },
    { kind: "url", path: "locationSearchUrl", label: "Location search link", max: 300 },
  ],
  mission_vision: [
    { kind: "textarea", path: "mission", label: "Mission", max: 600, rows: 4 },
    { kind: "textarea", path: "vision", label: "Vision", max: 600, rows: 4 },
    { kind: "text", path: "brandStatement", label: "Brand statement", max: 300 },
    { kind: "text", path: "brandStatementSource", label: "Statement source", max: 160 },
  ],
  homepage: [
    { kind: "text", path: "heroTitle", label: "Hero title", max: 120 },
    { kind: "textarea", path: "heroSubtitle", label: "Hero subtitle", max: 600, rows: 3 },
    { kind: "text", path: "introTitle", label: "Intro title", max: 120 },
    { kind: "textarea", path: "introBody", label: "Intro body", max: 1500, rows: 4 },
    { kind: "text", path: "servicesTitle", label: "Services title", max: 120 },
    { kind: "textarea", path: "servicesSubtitle", label: "Services subtitle", max: 600, rows: 3 },
    { kind: "text", path: "whyTitle", label: "Why choose Lalica title", max: 120 },
    { kind: "text", path: "storyTitle", label: "Story panel title", max: 120 },
    { kind: "text", path: "projectsTitle", label: "Projects title", max: 120 },
    { kind: "text", path: "csrTitle", label: "CSR title", max: 120 },
    { kind: "text", path: "partnersTitle", label: "Partners title", max: 120 },
    { kind: "text", path: "contactTitle", label: "Contact title", max: 120 },
    { kind: "textarea", path: "contactBody", label: "Contact body", max: 600, rows: 3 },
  ],
  partners: [
    { kind: "bool", path: "published", label: "Show partners on the public site", hint: "Switch on only after the company confirms the wording and approves the brand logo use." },
    { kind: "text", path: "label", label: "Section label", max: 120 },
    { kind: "textarea", path: "disclaimer", label: "Section disclaimer", max: 600, rows: 2 },
    { kind: "text", path: "sourceReference", label: "Source reference", max: 300 },
  ],
  certifications: [
    { kind: "bool", path: "published", label: "Show certifications on the public site", hint: "No certifications were found in the profile. Add them only with document evidence." },
    { kind: "text", path: "label", label: "Section label", max: 120 },
  ],
  social: [
    { kind: "bool", path: "published", label: "Show social links on the public site", hint: "Switch on only with confirmed account URLs." },
  ],
  seo_defaults: [
    { kind: "text", path: "defaultTitle", label: "Default page title", max: 120 },
    { kind: "textarea", path: "defaultDescription", label: "Default description", max: 300, rows: 3 },
    { kind: "text", path: "siteName", label: "Site name", max: 80 },
  ],
  features: [
    { kind: "select", path: "newsNav", label: "News navigation entry", options: [["auto", "Show when news exists"], ["on", "Always show"], ["off", "Never show"]] },
    { kind: "bool", path: "homeProjects", label: "Homepage projects panel", hint: "The panel also hides itself while no projects are published." },
    { kind: "bool", path: "homeCsr", label: "Homepage CSR panel", hint: "The panel also hides itself while no CSR stories are published." },
  ],
  profile_download: [
    { kind: "bool", path: "enabled", label: "Allow public download of the company profile", hint: "Switch on only after the company approves the PDF for public sharing." },
    { kind: "text", path: "fileName", label: "File name shown", max: 120 },
    { kind: "text", path: "sizeLabel", label: "Size label", max: 60 },
  ],
  navigation: [],
  privacy: [],
  redirects: [],
};

/* ------------------------------------------------------------------ */
/* List-of-object editors                                              */
/* ------------------------------------------------------------------ */

interface NamedEntry {
  id: string;
  [key: string]: unknown;
}

function EntryListEditor({
  label,
  entries,
  onChange,
  fieldSpecs,
  hint,
}: {
  label: string;
  entries: NamedEntry[];
  onChange: (entries: NamedEntry[]) => void;
  fieldSpecs: { key: string; label: string; placeholder?: string; textarea?: boolean }[];
  hint?: string;
}) {
  return (
    <div className="text-sm">
      <p className="font-bold text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-normal text-ink-500">{hint}</p>}
      <div className="mt-2 space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="rounded-md border border-brand-100 bg-white p-3">
            <div className="space-y-2">
              {fieldSpecs.map((spec) => (
                <div key={spec.key}>
                  <p className="text-xs font-bold text-ink-600">{spec.label}</p>
                  {spec.textarea ? (
                    <textarea
                      value={String(entry[spec.key] ?? "")}
                      onChange={(event) => {
                        const next = [...entries];
                        next[index] = { ...entry, [spec.key]: event.target.value };
                        onChange(next);
                      }}
                      rows={2}
                      placeholder={spec.placeholder}
                      className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm font-normal text-ink-900"
                    />
                  ) : (
                    <input
                      value={String(entry[spec.key] ?? "")}
                      onChange={(event) => {
                        const next = [...entries];
                        next[index] = { ...entry, [spec.key]: event.target.value };
                        onChange(next);
                      }}
                      placeholder={spec.placeholder}
                      className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm font-normal text-ink-900"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, itemIndex) => itemIndex !== index))}
              className="mt-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...entries,
            {
              id: crypto.randomUUID(),
              ...Object.fromEntries(fieldSpecs.map((spec) => [spec.key, ""])),
            },
          ])
        }
        className="mt-2 rounded-md border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50"
      >
        Add entry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section forms                                                      */
/* ------------------------------------------------------------------ */

function PartnersExtra({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <EntryListEditor
      label="Partner entries"
      hint="Brands displayed under Our Partners in the profile. Wording and logo use must be confirmed by the company before publication."
      entries={(value.entries as NamedEntry[]) ?? []}
      onChange={(entries) => onChange({ ...value, entries })}
      fieldSpecs={[
        { key: "name", label: "Brand name", placeholder: "For example: ABB" },
        { key: "note", label: "Note (optional)", placeholder: "For example: shown in the company profile" },
      ]}
    />
  );
}

function CertificationsExtra({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <EntryListEditor
      label="Certification entries"
      hint="Add only with document evidence. None were found in the profile."
      entries={(value.entries as NamedEntry[]) ?? []}
      onChange={(entries) => onChange({ ...value, entries })}
      fieldSpecs={[
        { key: "title", label: "Title", placeholder: "For example: NCA registration" },
        { key: "issuer", label: "Issuer (optional)" },
        { key: "note", label: "Note (optional)" },
      ]}
    />
  );
}

function SocialExtra({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <EntryListEditor
      label="Social entries"
      hint="Confirmed account URLs only."
      entries={(value.entries as NamedEntry[]) ?? []}
      onChange={(entries) => onChange({ ...value, entries })}
      fieldSpecs={[
        { key: "label", label: "Label", placeholder: "For example: LinkedIn" },
        { key: "url", label: "URL (https)" },
      ]}
    />
  );
}

function NavigationExtra({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <EntryListEditor
      label="Primary navigation"
      hint="Optional extra links for the main menu. Core pages (Home, Services, Projects, CSR, Contact) are automatic."
      entries={(value.primary as NamedEntry[]) ?? []}
      onChange={(primary) => onChange({ ...value, primary })}
      fieldSpecs={[
        { key: "label", label: "Label", placeholder: "For example: Careers" },
        { key: "href", label: "Path", placeholder: "For example: /careers" },
      ]}
    />
  );
}

function RedirectsExtra({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <EntryListEditor
      label="Redirect entries"
      hint="Old paths redirecting to new ones. Published slug changes add entries here automatically."
      entries={(value.entries as NamedEntry[]) ?? []}
      onChange={(entries) => onChange({ ...value, entries })}
      fieldSpecs={[
        { key: "from", label: "From path", placeholder: "/projects/old-name" },
        { key: "to", label: "To path", placeholder: "/projects/new-name" },
      ]}
    />
  );
}

function PrivacyExtra({
  value,
  onSave,
  onPublish,
  busy,
}: {
  value: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  onPublish: () => void;
  busy: string | null;
}) {
  const draft = (value.draft as Record<string, unknown>) ?? { sections: [] };
  const sections = (draft.sections as NamedEntry[]) ?? [];
  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-md bg-accent-50 px-4 py-3 text-xs leading-5 text-ink-700">
        The policy starts as a draft prepared for this website. Review it with
        the company owner, then publish. Publication records the date, bumps
        the version, and makes the reviewed sections public.
      </p>
      <EntryListEditor
        label="Policy sections"
        entries={sections}
        onChange={(next) =>
          onSave({ ...value, draft: { ...draft, sections: next } })
        }
        fieldSpecs={[
          { key: "heading", label: "Heading", placeholder: "For example: Information we collect" },
          { key: "body", label: "Body", textarea: true, placeholder: "The section text." },
        ]}
      />
      <div>
        <p className="font-bold text-ink-800">Review note</p>
        <textarea
          value={String(value.reviewedNote ?? "")}
          onChange={(event) => onSave({ ...value, reviewedNote: event.target.value })}
          rows={2}
          maxLength={600}
          className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
        />
      </div>
      <p className="text-xs text-ink-500">
        Current version: {String(value.version ?? 0)}
        {value.publishedAt
          ? ` | published ${new Date(String(value.publishedAt)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
          : " | not published yet"}
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={onPublish}
        className="rounded-md bg-brand-700 px-4 py-2 text-sm font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
      >
        {busy === "publish" ? "Publishing..." : "Publish this policy"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main section form                                                  */
/* ------------------------------------------------------------------ */

export function SettingsSectionForm({
  settingsKey,
  label,
  initialValue,
}: {
  settingsKey: SettingsKey;
  label: string;
  initialValue: unknown;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Record<string, unknown>>(() =>
    cloneValue(initialValue),
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const specs = useMemo(() => FIELD_SPECS[settingsKey] ?? [], [settingsKey]);

  function applyErrors(result: ActionResult) {
    if (result.ok) {
      setErrors({});
      setMessage({ tone: "ok", text: "Saved." });
      router.refresh();
      return;
    }
    setErrors(result.fieldErrors ?? {});
    setMessage({ tone: "error", text: result.error });
  }

  async function save(nextValue: Record<string, unknown>) {
    setBusy("save");
    setMessage(null);
    const result = await updateSettingsAction({ key: settingsKey, value: nextValue });
    setBusy(null);
    applyErrors(result);
  }

  async function publishPrivacy() {
    setBusy("publish");
    setMessage(null);
    const result = await publishPrivacyAction({ value });
    setBusy(null);
    applyErrors(result);
  }

  return (
    <section
      aria-labelledby={`settings-${settingsKey}`}
      className="rounded-lg border border-brand-100 bg-white p-5"
    >
      <h2 id={`settings-${settingsKey}`} className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
        {label}
      </h2>
      <div className="mt-4 space-y-4">
        {specs.map((spec) => (
          <div key={`${spec.kind}-${spec.path}`}>
            {spec.kind === "bool" ? (
              <label className="flex items-start gap-3 text-sm font-bold text-ink-800">
                <input
                  type="checkbox"
                  checked={Boolean(getPath(value, spec.path))}
                  onChange={(event) =>
                    setValue((current) => setPath(current, spec.path, event.target.checked))
                  }
                  className="mt-0.5 accent-brand-700"
                />
                <span>
                  {spec.label}
                  {spec.hint && (
                    <span className="mt-0.5 block text-xs font-normal text-ink-500">
                      {spec.hint}
                    </span>
                  )}
                </span>
              </label>
            ) : spec.kind === "select" ? (
              <label className="block text-sm font-bold text-ink-800">
                {spec.label}
                <select
                  value={String(getPath(value, spec.path) ?? "")}
                  onChange={(event) =>
                    setValue((current) => setPath(current, spec.path, event.target.value))
                  }
                  className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
                >
                  {spec.options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                      {optionLabel}
                    </option>
                  ))}
                </select>
                {spec.hint && (
                  <span className="mt-1 block text-xs font-normal text-ink-500">{spec.hint}</span>
                )}
              </label>
            ) : spec.kind === "stringList" ? (
              <StringListField
                label={spec.label}
                hint={spec.hint}
                placeholder={spec.placeholder}
                max={spec.max}
                items={(getPath(value, spec.path) as string[]) ?? []}
                onChange={(items) =>
                  setValue((current) => setPath(current, spec.path, items))
                }
                errors={errors[spec.path]}
              />
            ) : spec.kind === "textarea" ? (
              <label className="block text-sm font-bold text-ink-800">
                {spec.label}
                <textarea
                  value={String(getPath(value, spec.path) ?? "")}
                  onChange={(event) =>
                    setValue((current) => setPath(current, spec.path, event.target.value))
                  }
                  rows={spec.rows ?? 3}
                  maxLength={spec.max}
                  className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
                />
                {spec.hint && (
                  <span className="mt-1 block text-xs font-normal text-ink-500">{spec.hint}</span>
                )}
                {errors[spec.path] && (
                  <span className="mt-1 block text-xs font-semibold text-red-700">
                    {errors[spec.path]?.[0]}
                  </span>
                )}
              </label>
            ) : (
              <label className="block text-sm font-bold text-ink-800">
                {spec.label}
                <input
                  type={spec.kind === "number" ? "number" : "text"}
                  value={String(getPath(value, spec.path) ?? "")}
                  onChange={(event) =>
                    setValue((current) =>
                      setPath(
                        current,
                        spec.path,
                        spec.kind === "number"
                          ? Number.parseInt(event.target.value || "0", 10)
                          : event.target.value,
                      ),
                    )
                  }
                  maxLength={spec.max}
                  className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
                />
                {spec.hint && (
                  <span className="mt-1 block text-xs font-normal text-ink-500">{spec.hint}</span>
                )}
                {errors[spec.path] && (
                  <span className="mt-1 block text-xs font-semibold text-red-700">
                    {errors[spec.path]?.[0]}
                  </span>
                )}
              </label>
            )}
          </div>
        ))}

        {settingsKey === "partners" && (
          <PartnersExtra value={value} onChange={setValue} />
        )}
        {settingsKey === "certifications" && (
          <CertificationsExtra value={value} onChange={setValue} />
        )}
        {settingsKey === "social" && <SocialExtra value={value} onChange={setValue} />}
        {settingsKey === "navigation" && (
          <NavigationExtra value={value} onChange={setValue} />
        )}
        {settingsKey === "redirects" && (
          <RedirectsExtra value={value} onChange={setValue} />
        )}
        {settingsKey === "privacy" && (
          <PrivacyExtra
            value={value}
            onSave={setValue}
            onPublish={publishPrivacy}
            busy={busy}
          />
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-md px-4 py-3 text-sm font-semibold ${
            message.tone === "ok" ? "bg-green-100 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => save(value)}
          className="rounded-md bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
        >
          {busy === "save" ? "Saving..." : "Save changes"}
        </button>
      </div>
    </section>
  );
}

function StringListField({
  label,
  hint,
  placeholder,
  max,
  items,
  onChange,
  errors,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  max?: number;
  items: string[];
  onChange: (items: string[]) => void;
  errors?: string[];
}) {
  return (
    <div className="text-sm">
      <p className="font-bold text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-normal text-ink-500">{hint}</p>}
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Remove item ${index + 1}`}
              className="rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-2 rounded-md border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50"
      >
        Add item
      </button>
      {errors && <p className="mt-1 text-xs font-semibold text-red-700">{errors[0]}</p>}
    </div>
  );
}
