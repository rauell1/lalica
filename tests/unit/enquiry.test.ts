import { describe, expect, it } from "vitest";

import {
  enquiryFieldErrors,
  enquiryPayloadSchema,
} from "@/lib/enquiry/schemas";
import { neutraliseCsvCell, toCsv } from "@/lib/utils/csv";

function validEnquiry() {
  return {
    name: "Jane Wanjiku",
    organisation: "",
    email: "jane@example.com",
    telephone: "+254 712 345 678",
    serviceInterest: "Electrical and Automation Engineering",
    message: "We would like a quote for a motor control panel audit.",
    privacyAccepted: true,
    privacyVersion: "1.0",
    idempotencyKey: crypto.randomUUID(),
    companyWebsite: "",
    turnstileToken: "",
  };
}

describe("enquiry payload schema", () => {
  it("accepts a complete valid submission", () => {
    expect(enquiryPayloadSchema.safeParse(validEnquiry()).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const errors = enquiryFieldErrors({ ...validEnquiry(), email: "not-an-email" });
    expect(errors?.email?.[0]).toContain("valid email");
  });

  it("rejects a missing privacy acknowledgement", () => {
    const errors = enquiryFieldErrors({ ...validEnquiry(), privacyAccepted: false });
    expect(errors?.privacyAccepted?.[0]).toContain("privacy");
  });

  it("rejects a message that is too short", () => {
    const errors = enquiryFieldErrors({ ...validEnquiry(), message: "Hi" });
    expect(errors?.message).toBeTruthy();
  });

  it("rejects a non-UUID idempotency key", () => {
    const errors = enquiryFieldErrors({
      ...validEnquiry(),
      idempotencyKey: "not-a-uuid",
    });
    expect(errors?.idempotencyKey).toBeTruthy();
  });

  it("rejects a filled honeypot field", () => {
    const errors = enquiryFieldErrors({ ...validEnquiry(), companyWebsite: "spam.example" });
    expect(errors?.companyWebsite).toBeTruthy();
  });

  it("rejects en dashes in the message", () => {
    // The dash is built from an escape so the authored source stays clean.
    const errors = enquiryFieldErrors({
      ...validEnquiry(),
      message: `Ten ${String.fromCharCode(0x2013)} twenty units need service.`,
    });
    expect(JSON.stringify(errors?.message)).toContain("en dash");
  });
});

describe("CSV neutralisation", () => {
  it("prefixes formula trigger characters with an apostrophe", () => {
    expect(neutraliseCsvCell("=cmd|calc!A1")).toBe("'=cmd|calc!A1");
    expect(neutraliseCsvCell("@SUM(1+2)")).toBe("'@SUM(1+2)");
    expect(neutraliseCsvCell("+254700000001")).toBe("'+254700000001");
    expect(neutraliseCsvCell("-10")).toBe("'-10");
    expect(neutraliseCsvCell("\tweird")).toBe("'\tweird");
  });

  it("leaves ordinary text untouched", () => {
    expect(neutraliseCsvCell("Hello world")).toBe("Hello world");
    expect(neutraliseCsvCell("jane@example.com")).toBe("jane@example.com");
  });

  it("escapes quotes and embedded formula text in full CSV rows", () => {
    const csv = toCsv(
      ["Name", "Message"],
      [
        ["=HYPERLINK(\"http://evil\",\"x\")", "Safe text"],
      ],
    );
    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv).toContain("\"\"http://evil\"\"");
  });
});
