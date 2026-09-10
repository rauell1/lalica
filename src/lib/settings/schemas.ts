/**
 * Validated JSONB schemas for the named site_settings records.
 *
 * The site uses a small set of named records rather than one row per
 * text label or an unrestricted generic key-value editor.
 */

import { z } from "zod";

import {
  dashViolationMessage,
  findDashViolations,
  SLUG_PATTERN,
} from "@/lib/utils/text";

const clean = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .superRefine((value, ctx) => {
      const violations = findDashViolations(value);
      if (violations.length > 0) {
        ctx.addIssue({ code: "custom", message: dashViolationMessage(violations) });
      }
    });

const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value === "" || /^https:\/\/.+/.test(value),
    "Use a full https:// URL or leave this field empty.",
  );

/* ------------------------------------------------------------------ */

export const companySettingsSchema = z.object({
  name: clean(120).default("Lalica Engineering Limited"),
  shortName: clean(60).default("Lalica"),
  description: clean(1500).default(
    "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients. Based in Kahawa West, Nairobi, we support reliable operations through installation, maintenance, and technical engineering services.",
  ),
  priorities: z.array(clean(160)).max(12).default([
    "Excellence",
    "Innovation",
    "Reliability",
    "Tailored services",
    "Efficient project execution",
    "Long-term performance",
    "Client satisfaction",
  ]),
  addressLine: clean(160).default("DSM Center, Kahawa West, Nairobi, Kenya"),
  region: clean(80).default("Nairobi, Kenya"),
  telephone: clean(40).default("+254728112444"),
  telephoneDisplay: clean(60).default("+254 728 112 444"),
  email: z.string().email().default("info@lalicaengineering.com"),
  websiteDisplay: clean(80).default("www.lalicaengineering.com"),
  locationSearchUrl: urlOrEmpty.default(
    "https://www.google.com/maps/search/?api=1&query=DSM%20Center%2C%20Kahawa%20West%2C%20Nairobi%2C%20Kenya",
  ),
});

export const contactsSettingsSchema = z.object({
  telephone: clean(40).default("+254728112444"),
  telephoneDisplay: clean(60).default("+254 728 112 444"),
  email: z.string().email().default("info@lalicaengineering.com"),
  /** Confirmed WhatsApp number. Disabled until the company confirms one. */
  whatsappNumber: clean(40).default(""),
  whatsappConfirmed: z.boolean().default(false),
  /** Business hours were not found in the profile and stay empty until confirmed. */
  businessHours: clean(300).default(""),
  addressLine: clean(160).default("DSM Center, Kahawa West, Nairobi, Kenya"),
  locationSearchUrl: urlOrEmpty.default(
    "https://www.google.com/maps/search/?api=1&query=DSM%20Center%2C%20Kahawa%20West%2C%20Nairobi%2C%20Kenya",
  ),
});

export const missionVisionSchema = z.object({
  mission: clean(600).default(
    "To provide professional, reliable, and innovative engineering solutions that enhance operational efficiency, safety, and sustainability for our clients.",
  ),
  vision: clean(600).default(
    "To be a leading engineering solutions provider recognized for quality, integrity, and technological advancement in industrial and commercial sectors.",
  ),
  brandStatement: clean(300).default(
    "Transforming concepts into reality and nurturing innovation",
  ),
  brandStatementSource: clean(160).default(
    "Statement from the Lalica company profile",
  ),
});

export const homepageSettingsSchema = z.object({
  heroTitle: clean(120).default("Engineering solutions for reliable operations."),
  heroSubtitle: clean(600).default(
    "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients.",
  ),
  introTitle: clean(120).default("An engineering partner for dependable operations"),
  introBody: clean(1500).default(
    "Based in Kahawa West, Nairobi, we support reliable operations through installation, maintenance, and technical engineering services. Our work is guided by a commitment to excellence, innovation, reliability, tailored services, efficient project execution, long-term performance, and client satisfaction.",
  ),
  servicesTitle: clean(120).default("Our services"),
  servicesSubtitle: clean(600).default(
    "Three service groups cover electrical and automation engineering, mechanical engineering, and refrigeration and HVAC solutions.",
  ),
  whyTitle: clean(120).default("Why choose Lalica"),
  storyTitle: clean(120).default("Transforming concepts into reality"),
  projectsTitle: clean(120).default("Recent projects"),
  csrTitle: clean(120).default("Corporate social responsibility"),
  partnersTitle: clean(120).default("Our partners"),
  contactTitle: clean(120).default("Talk to our team"),
  contactBody: clean(600).default(
    "Tell us about your facility, plant, or project. We will get back to you to discuss the best way forward.",
  ),
});

export const partnerEntrySchema = z.object({
  id: z.string().uuid(),
  name: clean(120),
  note: clean(300).default(""),
});

export const partnersSettingsSchema = z.object({
  /** The profile displays these brands under "Our Partners". The wording
   *  of the public section must be confirmed by the company first. */
  published: z.boolean().default(false),
  label: clean(120).default("Our partners"),
  disclaimer: clean(600).default(
    "The Lalica company profile displays these brands under the heading Our Partners.",
  ),
  sourceReference: clean(300).default(
    "Lalica Company Profile_.pdf, physical page 10, Our Partners",
  ),
  entries: z.array(partnerEntrySchema).max(30).default([]),
});

export const certificationsSettingsSchema = z.object({
  /** No certifications or licences were found in the company profile. */
  published: z.boolean().default(false),
  label: clean(120).default("Certifications and licences"),
  entries: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: clean(160),
        issuer: clean(160).default(""),
        note: clean(300).default(""),
      }),
    )
    .max(20)
    .default([]),
});

export const socialSettingsSchema = z.object({
  /** No social media accounts were confirmed in the company profile. */
  published: z.boolean().default(false),
  entries: z
    .array(
      z.object({
        id: z.string().uuid(),
        label: clean(60),
        url: urlOrEmpty,
      }),
    )
    .max(10)
    .default([]),
});

export const seoDefaultsSchema = z.object({
  defaultTitle: clean(120).default(
    "Lalica Engineering Limited | Electrical, Mechanical, Refrigeration and HVAC Solutions in Nairobi",
  ),
  defaultDescription: clean(300).default(
    "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients in Kenya.",
  ),
  siteName: clean(80).default("Lalica Engineering Limited"),
});

export const featuresSettingsSchema = z.object({
  /** "auto" shows the News entry only when published news exists. */
  newsNav: z.enum(["auto", "on", "off"]).default("auto"),
  /** Show the projects panel on the homepage. Safe default: always on,
   *  the panel hides itself when no projects are published. */
  homeProjects: z.boolean().default(true),
  homeCsr: z.boolean().default(true),
});

export const profileDownloadSchema = z.object({
  /** Only enable after the company approves the PDF for public sharing. */
  enabled: z.boolean().default(false),
  fileName: clean(120).default("Lalica Company Profile.pdf"),
  sizeLabel: clean(60).default("approximately 12.2 MB"),
});

export const navigationSchema = z.object({
  primary: z
    .array(
      z.object({
        id: z.string(),
        label: clean(40),
        href: z
          .string()
          .regex(
            /^\/(?:$|[a-z0-9-]+(?:-[a-z0-9]+)*(?:\/[a-z0-9-]+(?:-[a-z0-9]+)*)*$)/,
            "Use a site path like /services.",
          ),
      }),
    )
    .max(10)
    .default([]),
});

export const privacySectionSchema = z.object({
  id: z.string().uuid(),
  heading: clean(160),
  body: clean(4000),
});

export const privacySettingsSchema = z.object({
  draft: z
    .object({
      sections: z.array(privacySectionSchema).max(20),
    })
    .default({ sections: [] }),
  /** Set when an administrator publishes the reviewed policy. */
  publishedAt: z.string().datetime().nullable().default(null),
  /** Set when the policy was last published. */
  publishedSections: z.array(privacySectionSchema).nullable().default(null),
  version: z.number().int().min(0).default(0),
  reviewedNote: clean(600).default(
    "This draft was prepared to match the data the website actually collects and the processors it uses. It must be reviewed by the company owner before publication.",
  ),
});

export const redirectEntrySchema = z.object({
  from: z
    .string()
    .regex(/^\/[a-z0-9/-]{1,200}$/, "Use a site path like /projects/old-name."),
  to: z
    .string()
    .regex(/^\/[a-z0-9/-]{1,200}$/, "Use a site path like /projects/new-name."),
  createdAt: z.string().datetime(),
});

export const redirectsSettingsSchema = z.object({
  entries: z.array(redirectEntrySchema).max(100).default([]),
});

/* ------------------------------------------------------------------ */

export const settingsSchemas = {
  company: companySettingsSchema,
  contacts: contactsSettingsSchema,
  mission_vision: missionVisionSchema,
  homepage: homepageSettingsSchema,
  partners: partnersSettingsSchema,
  certifications: certificationsSettingsSchema,
  social: socialSettingsSchema,
  seo_defaults: seoDefaultsSchema,
  features: featuresSettingsSchema,
  profile_download: profileDownloadSchema,
  navigation: navigationSchema,
  privacy: privacySettingsSchema,
  redirects: redirectsSettingsSchema,
} as const;

export type SettingsKey = keyof typeof settingsSchemas;

export const SETTINGS_KEYS = Object.keys(settingsSchemas) as SettingsKey[];

export const SETTINGS_KEY_LABELS: Record<SettingsKey, string> = {
  company: "Company information",
  contacts: "Contacts",
  mission_vision: "Mission and vision",
  homepage: "Homepage content",
  partners: "Partners",
  certifications: "Certifications",
  social: "Social links",
  seo_defaults: "SEO defaults",
  features: "Feature visibility",
  profile_download: "Profile download",
  navigation: "Navigation",
  privacy: "Privacy policy",
  redirects: "Redirects",
};

export interface SettingsValues {
  company: z.infer<typeof companySettingsSchema>;
  contacts: z.infer<typeof contactsSettingsSchema>;
  mission_vision: z.infer<typeof missionVisionSchema>;
  homepage: z.infer<typeof homepageSettingsSchema>;
  partners: z.infer<typeof partnersSettingsSchema>;
  certifications: z.infer<typeof certificationsSettingsSchema>;
  social: z.infer<typeof socialSettingsSchema>;
  seo_defaults: z.infer<typeof seoDefaultsSchema>;
  features: z.infer<typeof featuresSettingsSchema>;
  profile_download: z.infer<typeof profileDownloadSchema>;
  navigation: z.infer<typeof navigationSchema>;
  privacy: z.infer<typeof privacySettingsSchema>;
  redirects: z.infer<typeof redirectsSettingsSchema>;
}

export function parseSettingsValue<K extends SettingsKey>(
  key: K,
  value: unknown,
): SettingsValues[K] {
  return settingsSchemas[key].parse(value) as SettingsValues[K];
}

export function settingsFieldErrors<K extends SettingsKey>(
  key: K,
  value: unknown,
): Record<string, string[]> | null {
  const result = settingsSchemas[key].safeParse(value);
  if (result.success) return null;
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "form";
    out[field] = out[field] ?? [];
    out[field].push(issue.message);
  }
  return out;
}

export { SLUG_PATTERN };
