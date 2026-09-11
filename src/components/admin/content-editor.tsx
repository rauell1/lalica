"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createContentAction,
  publishContentAction,
  submitForReviewAction,
  updateContentAction,
  type ActionResult,
} from "@/app/admin/actions";
import {
  newCalloutBlock,
  newDividerBlock,
  newHeadingBlock,
  newImageBlock,
  newListBlock,
  newParagraphBlock,
  newQuoteBlock,
  type Body,
  type BodyBlock,
} from "@/lib/content/blocks";
import {
  SERVICE_GROUP_LABELS,
  SERVICE_GROUPS,
  type ContentDraft,
  type CsrMetadata,
  type ProjectMetadata,
} from "@/lib/content/types";
import type { ContentType } from "@/lib/db";
import { StatusBadge } from "@/components/ui/status-badge";

export interface MediaOption {
  id: string;
  altText: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/* Small form primitives                                              */
/* ------------------------------------------------------------------ */

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
      {errors[0]}
    </p>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  hint,
  required,
  errors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  hint?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <label className="block text-sm font-bold text-ink-800">
      {label} {required && <span className="text-red-700">*</span>}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900 focus:border-brand-500"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-ink-500">{hint}</span>}
      <FieldError errors={errors} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  maxLength,
  hint,
  required,
  errors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  hint?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <label className="block text-sm font-bold text-ink-800">
      {label} {required && <span className="text-red-700">*</span>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900 focus:border-brand-500"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-ink-500">{hint}</span>}
      <FieldError errors={errors} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  errors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  hint?: string;
  errors?: string[];
}) {
  return (
    <label className="block text-sm font-bold text-ink-800">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs font-normal text-ink-500">{hint}</span>}
      <FieldError errors={errors} />
    </label>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  hint,
  errors,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  hint?: string;
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
      <FieldError errors={errors} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media pickers                                                      */
/* ------------------------------------------------------------------ */

function MediaThumb({ option }: { option: MediaOption }) {
  return (
    <span className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/media/${option.id}`}
        alt=""
        className="h-10 w-14 shrink-0 rounded-md border border-brand-100 bg-surface object-cover"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink-900">
          {option.altText}
        </span>
        <span className="block text-xs text-ink-500">
          {option.status === "published" ? "Published" : "Draft: publish it before publishing content"}
        </span>
      </span>
    </span>
  );
}

function MediaPicker({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: MediaOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
}) {
  const selected = options.find((option) => option.id === value);
  return (
    <div className="text-sm">
      <p className="font-bold text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-normal text-ink-500">{hint}</p>}
      {options.length === 0 ? (
        <p className="mt-2 rounded-md bg-accent-50 px-3 py-2 text-xs text-ink-700">
          No images yet. Upload one from the Media library first, then reload
          this page.
        </p>
      ) : (
        <>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-brand-200 bg-white p-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface">
              <input
                type="radio"
                name={`pick-${label}`}
                checked={value === null}
                onChange={() => onChange(null)}
                className="accent-brand-700"
              />
              <span className="text-sm text-ink-500">None</span>
            </label>
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface"
              >
                <input
                  type="radio"
                  name={`pick-${label}`}
                  checked={value === option.id}
                  onChange={() => onChange(option.id)}
                  className="accent-brand-700"
                />
                <MediaThumb option={option} />
              </label>
            ))}
          </div>
          {selected && (
            <p className="mt-2 text-xs text-ink-500">Selected: {selected.altText}</p>
          )}
        </>
      )}
    </div>
  );
}

function GalleryPicker({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: MediaOption[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
}) {
  return (
    <div className="text-sm">
      <p className="font-bold text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-normal text-ink-500">{hint}</p>}
      {options.length === 0 ? (
        <p className="mt-2 rounded-md bg-accent-50 px-3 py-2 text-xs text-ink-700">
          No images yet. Upload them from the Media library first.
        </p>
      ) : (
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-brand-200 bg-white p-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface"
            >
              <input
                type="checkbox"
                checked={value.includes(option.id)}
                onChange={(event) => {
                  if (event.target.checked) onChange([...value, option.id]);
                  else onChange(value.filter((id) => id !== option.id));
                }}
                className="accent-brand-700"
              />
              <MediaThumb option={option} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Body block editors                                                 */
/* ------------------------------------------------------------------ */

const BLOCK_LABELS: Record<BodyBlock["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  quote: "Quote",
  callout: "Callout",
  image: "Image",
  divider: "Divider",
};

function BlockEditor({
  block,
  mediaOptions,
  onChange,
  onMove,
  onDelete,
  index,
  total,
}: {
  block: BodyBlock;
  mediaOptions: MediaOption[];
  onChange: (block: BodyBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  index: number;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">
          {index + 1}. {BLOCK_LABELS[block.type]}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move block up"
            className="rounded-md border border-brand-200 px-2 py-1 text-xs font-bold text-ink-700 hover:bg-surface disabled:opacity-40"
          >
            Up
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move block down"
            className="rounded-md border border-brand-200 px-2 py-1 text-xs font-bold text-ink-700 hover:bg-surface disabled:opacity-40"
          >
            Down
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete block"
            className="rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {block.type === "heading" && (
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <SelectField
            label="Level"
            value={String(block.level)}
            onChange={(value) => onChange({ ...block, level: Number(value) as 2 | 3 })}
            options={[
              ["2", "H2"],
              ["3", "H3"],
            ]}
          />
          <TextField
            label="Heading text"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            maxLength={140}
          />
        </div>
      )}

      {block.type === "paragraph" && (
        <TextAreaField
          label="Paragraph text"
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          rows={4}
          maxLength={2000}
        />
      )}

      {block.type === "list" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-ink-800">
            <input
              type="checkbox"
              checked={block.ordered}
              onChange={(event) => onChange({ ...block, ordered: event.target.checked })}
              className="accent-brand-700"
            />
            Numbered list
          </label>
          <StringListEditor
            label="List items"
            items={block.items}
            onChange={(items) => onChange({ ...block, items })}
            placeholder="Item text"
          />
        </div>
      )}

      {block.type === "quote" && (
        <div className="space-y-3">
          <TextAreaField
            label="Quote text"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
            maxLength={800}
          />
          <TextField
            label="Attribution (optional)"
            value={block.attribution}
            onChange={(attribution) => onChange({ ...block, attribution })}
            maxLength={120}
          />
        </div>
      )}

      {block.type === "callout" && (
        <div className="space-y-3">
          <SelectField
            label="Tone"
            value={block.variant}
            onChange={(variant) =>
              onChange({ ...block, variant: variant as "info" | "success" | "warning" })
            }
            options={[
              ["info", "Information"],
              ["success", "Positive"],
              ["warning", "Attention"],
            ]}
          />
          <TextField
            label="Title (optional)"
            value={block.title}
            onChange={(title) => onChange({ ...block, title })}
            maxLength={100}
          />
          <TextAreaField
            label="Text"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
            maxLength={1000}
          />
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-3">
          <MediaPicker
            label="Image"
            options={mediaOptions}
            value={block.mediaId}
            onChange={(mediaId) => onChange({ ...block, mediaId: mediaId ?? "" })}
          />
          <TextField
            label="Alt text"
            value={block.alt}
            onChange={(alt) => onChange({ ...block, alt })}
            maxLength={200}
          />
          <TextField
            label="Caption (optional)"
            value={block.caption}
            onChange={(caption) => onChange({ ...block, caption })}
            maxLength={200}
          />
        </div>
      )}

      {block.type === "divider" && (
        <p className="text-sm text-ink-500">A horizontal divider between sections.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metadata editors                                                   */
/* ------------------------------------------------------------------ */

function ServiceMetadataEditor({
  metadata,
  onChange,
}: {
  metadata: { serviceGroup: string; order: number };
  onChange: (metadata: { serviceGroup: string; order: number }) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Service group"
        value={metadata.serviceGroup}
        onChange={(serviceGroup) => onChange({ ...metadata, serviceGroup })}
        options={SERVICE_GROUPS.map((group) => [group, SERVICE_GROUP_LABELS[group]])}
        hint="Used to group services on the homepage."
      />
      <TextField
        label="Display order"
        value={String(metadata.order)}
        onChange={(order) => onChange({ ...metadata, order: Number.parseInt(order || "0", 10) })}
        hint="Lower numbers appear first."
      />
    </div>
  );
}

function ProjectMetadataEditor({
  metadata,
  onChange,
  mediaOptions,
}: {
  metadata: ProjectMetadata;
  onChange: (metadata: ProjectMetadata) => void;
  mediaOptions: MediaOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Sector"
          value={metadata.sector}
          onChange={(sector) => onChange({ ...metadata, sector })}
          maxLength={80}
          required
          hint="For example: Food processing, Manufacturing."
        />
        <TextField
          label="Location"
          value={metadata.location}
          onChange={(location) => onChange({ ...metadata, location })}
          maxLength={120}
          required
          hint="Verified location only, for example: Nairobi, Kenya."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Client name display"
          value={metadata.clientDisplay}
          onChange={(clientDisplay) =>
            onChange({
              ...metadata,
              clientDisplay: clientDisplay as "named" | "anonymous" | "none",
            })
          }
          options={[
            ["none", "Do not show a client"],
            ["named", "Show the client name"],
            ["anonymous", "Show: Client name withheld"],
          ]}
          hint="Only name a client when they have confirmed it in writing."
        />
        {metadata.clientDisplay === "named" && (
          <TextField
            label="Client name"
            value={metadata.clientName}
            onChange={(clientName) => onChange({ ...metadata, clientName })}
            maxLength={120}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Project status"
          value={metadata.status}
          onChange={(status) => onChange({ ...metadata, status: status as "completed" | "ongoing" })}
          options={[
            ["completed", "Completed"],
            ["ongoing", "Ongoing"],
          ]}
        />
        <TextField
          label="Start (YYYY-MM)"
          value={metadata.startDate ?? ""}
          onChange={(startDate) => onChange({ ...metadata, startDate })}
          hint="Optional. Leave blank if unverified."
        />
        <TextField
          label="End (YYYY-MM)"
          value={metadata.endDate ?? ""}
          onChange={(endDate) => onChange({ ...metadata, endDate })}
          hint="Optional. Blank for ongoing work."
        />
      </div>
      <TextAreaField
        label="Challenge"
        value={metadata.challenge}
        onChange={(challenge) => onChange({ ...metadata, challenge })}
        rows={3}
        maxLength={2000}
        hint="Optional."
      />
      <TextAreaField
        label="Solution"
        value={metadata.solution}
        onChange={(solution) => onChange({ ...metadata, solution })}
        rows={3}
        maxLength={2000}
        hint="Optional."
      />
      <StringListEditor
        label="Outcomes (optional)"
        items={metadata.outcomes}
        onChange={(outcomes) => onChange({ ...metadata, outcomes })}
        placeholder="For example: Reduced unplanned downtime"
        hint="Only outcomes you can stand behind. No invented figures."
      />
      <StringListEditor
        label="Related services (optional)"
        items={metadata.relatedServices}
        onChange={(relatedServices) => onChange({ ...metadata, relatedServices })}
        placeholder="Service title, for example: Electrical and Automation Engineering"
      />
      <GalleryPicker
        label="Project gallery"
        options={mediaOptions}
        value={metadata.gallery}
        onChange={(gallery) => onChange({ ...metadata, gallery })}
        hint="Genuine project photographs only, with rights confirmed."
      />
    </div>
  );
}

function CsrMetadataEditor({
  metadata,
  onChange,
  mediaOptions,
}: {
  metadata: CsrMetadata;
  onChange: (metadata: CsrMetadata) => void;
  mediaOptions: MediaOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Initiative date (YYYY-MM-DD)"
          value={metadata.initiativeDate ?? ""}
          onChange={(initiativeDate) => onChange({ ...metadata, initiativeDate })}
          hint="When the activity happened, separate from publication date."
        />
        <TextField
          label="Location (optional)"
          value={metadata.location}
          onChange={(location) => onChange({ ...metadata, location })}
          maxLength={120}
        />
        <TextField
          label="Theme"
          value={metadata.theme}
          onChange={(theme) => onChange({ ...metadata, theme })}
          maxLength={100}
          required
          hint="For example: Youth skills development."
        />
      </div>
      <StringListEditor
        label="Verified partners (optional)"
        items={metadata.partners}
        onChange={(partners) => onChange({ ...metadata, partners })}
        placeholder="Partner name"
        hint="Only organisations that have confirmed their participation."
      />
      <div className="space-y-2">
        <p className="text-sm font-bold text-ink-800">Impact measures (optional)</p>
        <p className="text-xs text-ink-500">
          Every figure needs an evidence note and the method used. Never invent
          figures and never aggregate people reached across activities.
        </p>
        {metadata.impactMeasures.map((measure, index) => (
          <div key={index} className="rounded-md border border-brand-100 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={measure.label}
                onChange={(event) => {
                  const next = [...metadata.impactMeasures];
                  next[index] = { ...measure, label: event.target.value };
                  onChange({ ...metadata, impactMeasures: next });
                }}
                placeholder="Label, for example: Students trained"
                className="rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
              />
              <input
                value={measure.value}
                onChange={(event) => {
                  const next = [...metadata.impactMeasures];
                  next[index] = { ...measure, value: event.target.value };
                  onChange({ ...metadata, impactMeasures: next });
                }}
                placeholder="Value"
                className="rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
              />
              <input
                value={measure.unit}
                onChange={(event) => {
                  const next = [...metadata.impactMeasures];
                  next[index] = { ...measure, unit: event.target.value };
                  onChange({ ...metadata, impactMeasures: next });
                }}
                placeholder="Unit (optional)"
                className="rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
              />
            </div>
            <div className="mt-2 grid gap-2">
              <input
                value={measure.evidence}
                onChange={(event) => {
                  const next = [...metadata.impactMeasures];
                  next[index] = { ...measure, evidence: event.target.value };
                  onChange({ ...metadata, impactMeasures: next });
                }}
                placeholder="Evidence note, for example: Attendance register held by the partner"
                className="rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
              />
              <input
                value={measure.methodology}
                onChange={(event) => {
                  const next = [...metadata.impactMeasures];
                  next[index] = { ...measure, methodology: event.target.value };
                  onChange({ ...metadata, impactMeasures: next });
                }}
                placeholder="Methodology, for example: Count of signed-in participants"
                className="rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...metadata,
                  impactMeasures: metadata.impactMeasures.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
              className="mt-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Remove measure
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...metadata,
              impactMeasures: [
                ...metadata.impactMeasures,
                { label: "", value: "", unit: "", evidence: "", methodology: "" },
              ],
            })
          }
          className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50"
        >
          Add measure
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-ink-800">Related UN SDGs (optional)</p>
        <p className="text-xs text-ink-500">
          Add the Sustainable Development Goals this activity supports, with a
          short note on how.
        </p>
        {metadata.sdgs.map((sdg, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={String(sdg.number)}
              onChange={(event) => {
                const next = [...metadata.sdgs];
                next[index] = { ...sdg, number: Number.parseInt(event.target.value, 10) };
                onChange({ ...metadata, sdgs: next });
              }}
              aria-label={`SDG number ${index + 1}`}
              className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
            >
              {Array.from({ length: 17 }, (_, number) => number + 1).map((number) => (
                <option key={number} value={number}>
                  SDG {number}
                </option>
              ))}
            </select>
            <input
              value={sdg.note}
              onChange={(event) => {
                const next = [...metadata.sdgs];
                next[index] = { ...sdg, note: event.target.value };
                onChange({ ...metadata, sdgs: next });
              }}
              placeholder="How the activity supports this goal"
              className="w-full rounded-md border border-brand-200 px-3 py-2 text-sm font-normal"
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...metadata,
                  sdgs: metadata.sdgs.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              aria-label={`Remove SDG ${index + 1}`}
              className="rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...metadata, sdgs: [...metadata.sdgs, { number: 4, note: "" }] })}
          className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50"
        >
          Add SDG
        </button>
      </div>
      <TextAreaField
        label="Evidence notes (optional)"
        value={metadata.evidenceNotes}
        onChange={(evidenceNotes) => onChange({ ...metadata, evidenceNotes })}
        rows={3}
        maxLength={2000}
        hint="Where the supporting evidence lives, for the audit trail."
      />
      <GalleryPicker
        label="Gallery"
        options={mediaOptions}
        value={metadata.gallery}
        onChange={(gallery) => onChange({ ...metadata, gallery })}
        hint="Genuine photographs of the activity only, with rights confirmed."
      />
    </div>
  );
}

function NewsMetadataEditor({
  metadata,
  onChange,
}: {
  metadata: { category: string };
  onChange: (metadata: { category: string }) => void;
}) {
  return (
    <TextField
      label="Category (optional)"
      value={metadata.category}
      onChange={(category) => onChange({ ...metadata, category })}
      maxLength={60}
      hint="For example: Company update."
    />
  );
}

/* ------------------------------------------------------------------ */
/* Main editor                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_DRAFTS: Record<ContentType, Record<string, unknown>> = {
  service: {
    title: "",
    slug: "",
    excerpt: "",
    body: [newParagraphBlock()],
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    metadata: { serviceGroup: "electrical_automation", order: 50 },
  },
  project: {
    title: "",
    slug: "",
    excerpt: "",
    body: [newParagraphBlock()],
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    metadata: {
      sector: "",
      location: "",
      clientDisplay: "none",
      clientName: "",
      status: "completed",
      startDate: "",
      endDate: "",
      challenge: "",
      solution: "",
      outcomes: [],
      relatedServices: [],
      gallery: [],
    },
  },
  csr_story: {
    title: "",
    slug: "",
    excerpt: "",
    body: [newParagraphBlock()],
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    metadata: {
      initiativeDate: "",
      location: "",
      theme: "",
      partners: [],
      impactMeasures: [],
      sdgs: [],
      evidenceNotes: "",
      gallery: [],
    },
  },
  news: {
    title: "",
    slug: "",
    excerpt: "",
    body: [newParagraphBlock()],
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    metadata: { category: "" },
  },
};

export function ContentEditor({
  type,
  contentId,
  version,
  status,
  initialDraft,
  mediaOptions,
  canPublish,
  backHref,
}: {
  type: ContentType;
  contentId: string | null;
  version: number;
  status: string;
  initialDraft: unknown;
  mediaOptions: MediaOption[];
  canPublish: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const draftSource = useMemo(
    () =>
      ({
        ...DEFAULT_DRAFTS[type],
        ...(typeof initialDraft === "object" && initialDraft !== null
          ? (initialDraft as Record<string, unknown>)
          : {}),
        metadata: {
          ...((DEFAULT_DRAFTS[type].metadata as Record<string, unknown>) ?? {}),
          ...((typeof initialDraft === "object" && initialDraft !== null
            ? ((initialDraft as Record<string, unknown>).metadata as Record<string, unknown>)
            : {}) ?? {}),
        },
      }) as Record<string, unknown>,
    [type, initialDraft],
  );

  const [draft, setDraft] = useState<Record<string, unknown>>(draftSource);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const setField = (key: string, value: unknown) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const setMetadata = (value: unknown) => setField("metadata", value);
  const body = (draft.body as Body | undefined) ?? [];
  const setBody = (value: Body) => setField("body", value);

  function applyErrors(result: ActionResult | { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }) {
    if (result.ok) return true;
    setErrors(result.fieldErrors ?? {});
    setMessage({
      tone: "error",
      text: result.error ?? "Something went wrong. Please try again.",
    });
    return false;
  }

  async function save(): Promise<string | null> {
    setMessage(null);
    setErrors({});
    const payload = {
      title: (draft.title as string) ?? "",
      slug: (draft.slug as string) ?? "",
      excerpt: (draft.excerpt as string) ?? "",
      body: draft.body,
      coverMediaId: draft.coverMediaId ?? null,
      seoTitle: (draft.seoTitle as string) ?? "",
      seoDescription: (draft.seoDescription as string) ?? "",
      metadata: draft.metadata,
    };
    if (contentId) {
      const result = await updateContentAction({
        id: contentId,
        draft: payload,
        expectedVersion: version,
      });
      if (!applyErrors(result)) return null;
      setMessage({ tone: "ok", text: "Draft saved." });
      return contentId;
    }
    const result = await createContentAction({ type, draft: payload });
    if (!result.ok) {
      applyErrors(result);
      return null;
    }
    setMessage({ tone: "ok", text: "Draft saved." });
    return result.data?.id ?? null;
  }

  async function handleSave() {
    setBusy("save");
    try {
      await save();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveAndSubmit() {
    setBusy("submit");
    try {
      const id = await save();
      if (id) {
        const result = await submitForReviewAction({ id });
        if (!applyErrors(result)) return;
        setMessage({ tone: "ok", text: "Draft saved and submitted for review." });
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    setBusy("publish");
    try {
      const id = await save();
      if (id) {
        const result = await publishContentAction({ id, type });
        if (!applyErrors(result)) return;
        setMessage({ tone: "ok", text: "Published. The public site now shows the new version." });
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const metadata = (draft.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-md border border-brand-200 px-3 py-2 text-sm font-bold text-ink-700 transition-soft hover:bg-surface"
          >
            Back
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-900">
            {contentId ? "Edit" : "New"}{" "}
            {type === "csr_story" ? "CSR story" : type === "news" ? "news article" : type}
          </h1>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {contentId && status !== "published" && (
            <Link
              href={`${backHref}/${contentId}/preview`}
              target="_blank"
              className="rounded-md border border-brand-200 px-3.5 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50"
            >
              Preview draft
            </Link>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleSave}
            className="rounded-md border border-brand-200 px-3.5 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50 disabled:opacity-60"
          >
            {busy === "save" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleSaveAndSubmit}
            className="rounded-md border border-accent-600 px-3.5 py-2.5 text-sm font-bold text-accent-800 transition-soft hover:bg-accent-50 disabled:opacity-60"
          >
            {busy === "submit" ? "Saving..." : "Save and submit"}
          </button>
          {canPublish && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={handlePublish}
              className="rounded-md bg-brand-700 px-3.5 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
            >
              {busy === "publish" ? "Publishing..." : status === "published" ? "Save and publish" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-md px-4 py-3 text-sm font-semibold ${
            message.tone === "ok"
              ? "bg-green-100 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}
      {!canPublish && (
        <p className="mt-4 rounded-md bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-900">
          Your account can edit drafts and submit them for review. Only an
          administrator can publish.
        </p>
      )}

      <form className="mt-6 space-y-8" onSubmit={(event) => event.preventDefault()}>
        <section aria-labelledby="basics-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
          <h2 id="basics-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
            Basics
          </h2>
          <div className="mt-4 space-y-4">
            <TextField
              label="Title"
              value={(draft.title as string) ?? ""}
              onChange={(title) => setField("title", title)}
              maxLength={120}
              required
              errors={errors.title}
            />
            <TextField
              label="Slug"
              value={(draft.slug as string) ?? ""}
              onChange={(slug) => setField("slug", slug.toLowerCase())}
              maxLength={80}
              required
              hint="Lower case letters, numbers, and hyphens only. Changing the slug of a published item keeps the old address redirecting."
              errors={errors.slug}
            />
            <TextAreaField
              label="Summary"
              value={(draft.excerpt as string) ?? ""}
              onChange={(excerpt) => setField("excerpt", excerpt)}
              rows={2}
              maxLength={400}
              hint="Shown in listings and search results. One or two sentences."
              errors={errors.excerpt}
            />
            <MediaPicker
              label="Cover image (optional)"
              options={mediaOptions}
              value={(draft.coverMediaId as string | null) ?? null}
              onChange={(coverMediaId) => setField("coverMediaId", coverMediaId)}
              hint="Shown on listing cards. Leave blank for the default card."
            />
          </div>
        </section>

        <section aria-labelledby="body-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="body-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
              Body
            </h2>
            <label className="flex items-center gap-2 text-sm font-bold text-ink-800">
              Add block
              <select
                defaultValue=""
                onChange={(event) => {
                  const blockType = event.target.value;
                  if (!blockType) return;
                  const creators: Record<string, () => BodyBlock> = {
                    heading: newHeadingBlock,
                    paragraph: newParagraphBlock,
                    list: newListBlock,
                    quote: newQuoteBlock,
                    callout: newCalloutBlock,
                    image: () => newImageBlock(mediaOptions[0]?.id ?? "", ""),
                    divider: newDividerBlock,
                  };
                  const creator = creators[blockType];
                  if (creator) setBody([...body, creator()]);
                  event.target.value = "";
                }}
                className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"
              >
                <option value="">Choose...</option>
                <option value="heading">Heading</option>
                <option value="paragraph">Paragraph</option>
                <option value="list">List</option>
                <option value="quote">Quote</option>
                <option value="callout">Callout</option>
                <option value="image">Image</option>
                <option value="divider">Divider</option>
              </select>
            </label>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            Structured blocks only. Raw HTML, scripts, and documents are not
            accepted. Em dashes and en dashes are rejected on save.
          </p>
          <div className="mt-4 space-y-4">
            {body.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                mediaOptions={mediaOptions}
                index={index}
                total={body.length}
                onChange={(next) => setBody(body.map((item, itemIndex) => (itemIndex === index ? next : item)))}
                onMove={(direction) => {
                  const next = [...body];
                  const target = index + direction;
                  const current = next[index];
                  const swap = next[target];
                  if (current && swap) {
                    next[target] = current;
                    next[index] = swap;
                    setBody(next);
                  }
                }}
                onDelete={() => setBody(body.filter((_, itemIndex) => itemIndex !== index))}
              />
            ))}
            {body.length === 0 && (
              <p className="rounded-md bg-white px-4 py-6 text-center text-sm text-ink-500">
                The body is empty. Add at least one block.
              </p>
            )}
          </div>
          <FieldError errors={errors["body.0.text"]} />
          <FieldError errors={errors.body} />
        </section>

        {type === "service" && (
          <section aria-labelledby="service-meta-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
            <h2 id="service-meta-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
              Service details
            </h2>
            <div className="mt-4">
              <ServiceMetadataEditor
                metadata={metadata as unknown as { serviceGroup: string; order: number }}
                onChange={(next) => setMetadata(next)}
              />
            </div>
          </section>
        )}

        {type === "project" && (
          <section aria-labelledby="project-meta-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
            <h2 id="project-meta-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
              Project details
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              Only publish projects the company can document. No invented
              clients, dates, or figures.
            </p>
            <div className="mt-4">
              <ProjectMetadataEditor
                metadata={metadata as unknown as ProjectMetadata}
                onChange={(next) => setMetadata(next)}
                mediaOptions={mediaOptions}
              />
            </div>
          </section>
        )}

        {type === "csr_story" && (
          <section aria-labelledby="csr-meta-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
            <h2 id="csr-meta-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
              CSR details
            </h2>
            <div className="mt-4">
              <CsrMetadataEditor
                metadata={metadata as unknown as CsrMetadata}
                onChange={(next) => setMetadata(next)}
                mediaOptions={mediaOptions}
              />
            </div>
          </section>
        )}

        {type === "news" && (
          <section aria-labelledby="news-meta-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
            <h2 id="news-meta-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
              Article details
            </h2>
            <div className="mt-4">
              <NewsMetadataEditor
                metadata={metadata as unknown as { category: string }}
                onChange={(next) => setMetadata(next)}
              />
            </div>
          </section>
        )}

        <section aria-labelledby="seo-heading" className="rounded-lg border border-brand-100 bg-surface p-5">
          <h2 id="seo-heading" className="font-[family-name:var(--font-display)] text-base font-bold text-ink-900">
            Search preview
          </h2>
          <div className="mt-4 space-y-4">
            <TextField
              label="Page title"
              value={(draft.seoTitle as string) ?? ""}
              onChange={(seoTitle) => setField("seoTitle", seoTitle)}
              maxLength={70}
              hint="Optional. Defaults to the content title. Keep under 70 characters."
              errors={errors.seoTitle}
            />
            <TextAreaField
              label="Meta description"
              value={(draft.seoDescription as string) ?? ""}
              onChange={(seoDescription) => setField("seoDescription", seoDescription)}
              rows={2}
              maxLength={180}
              hint="Optional. Defaults to the summary. Keep under 180 characters."
              errors={errors.seoDescription}
            />
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-brand-100 pt-5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleSave}
            className="rounded-md border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-800 transition-soft hover:bg-brand-50 disabled:opacity-60"
          >
            {busy === "save" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleSaveAndSubmit}
            className="rounded-md border border-accent-600 px-4 py-2.5 text-sm font-bold text-accent-800 transition-soft hover:bg-accent-50 disabled:opacity-60"
          >
            {busy === "submit" ? "Saving..." : "Save and submit"}
          </button>
          {canPublish && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={handlePublish}
              className="rounded-md bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60"
            >
              {busy === "publish" ? "Publishing..." : status === "published" ? "Save and publish" : "Publish"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
