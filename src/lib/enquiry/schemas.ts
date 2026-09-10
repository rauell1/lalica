/**
 * Enquiry payload validation.
 */

import { z } from "zod";

import { dashViolationMessage, findDashViolations } from "@/lib/utils/text";

const clean = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .superRefine((value, ctx) => {
      const violations = findDashViolations(value);
      if (violations.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: dashViolationMessage(violations),
        });
      }
    });

const telephonePattern = /^[0-9+()\-. ]{6,40}$/;

export const enquiryPayloadSchema = z.object({
  name: clean(120).min(2),
  organisation: clean(160).optional().default(""),
  email: z.email("Enter a valid email address."),
  telephone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || telephonePattern.test(value),
      "Enter a valid telephone number using digits, spaces, +, -, or parentheses.",
    )
    .optional()
    .default(""),
  serviceInterest: clean(80).min(1),
  message: clean(3000).min(10),
  privacyAccepted: z.literal(true, {
    message: "Please confirm the privacy notice to send your enquiry.",
  }),
  privacyVersion: z.string().trim().min(1).max(20),
  idempotencyKey: z.string().uuid("Invalid idempotency key."),
  /** Honeypot field: must stay empty. Real users never see it. */
  companyWebsite: z.string().max(0).optional().default(""),
  turnstileToken: z.string().max(4096).optional().default(""),
});

export type EnquiryPayload = z.infer<typeof enquiryPayloadSchema>;

export function enquiryFieldErrors(
  value: unknown,
): Record<string, string[]> | null {
  const result = enquiryPayloadSchema.safeParse(value);
  if (result.success) return null;
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] = out[key] ?? [];
    out[key].push(issue.message);
  }
  return out;
}
