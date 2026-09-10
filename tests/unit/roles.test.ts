import { describe, expect, it } from "vitest";

import {
  assertPermission,
  hasPermission,
  PERMISSIONS,
  type Permission,
} from "@/lib/auth/roles";
import { AppError } from "@/lib/errors";

const ALL_PERMISSIONS = Object.keys(
  PERMISSIONS.administrator,
).filter((key) => key.startsWith("can")) as Permission[];

describe("role permission matrix", () => {
  it("administrators hold every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("administrator", permission)).toBe(true);
    }
  });

  it("editors can edit, submit, and manage media but cannot publish, manage users, settings, or enquiries", () => {
    expect(hasPermission("editor", "canEditContent")).toBe(true);
    expect(hasPermission("editor", "canSubmitForReview")).toBe(true);
    expect(hasPermission("editor", "canUploadMedia")).toBe(true);
    expect(hasPermission("editor", "canManageMedia")).toBe(true);
    expect(hasPermission("editor", "canPublish")).toBe(false);
    expect(hasPermission("editor", "canManageUsers")).toBe(false);
    expect(hasPermission("editor", "canManageSettings")).toBe(false);
    expect(hasPermission("editor", "canAccessEnquiries")).toBe(false);
    expect(hasPermission("editor", "canViewAudit")).toBe(false);
  });

  it("enquiry managers can only access and export enquiries", () => {
    expect(hasPermission("enquiry_manager", "canAccessEnquiries")).toBe(true);
    expect(hasPermission("enquiry_manager", "canExportEnquiries")).toBe(true);
    expect(hasPermission("enquiry_manager", "canEditContent")).toBe(false);
    expect(hasPermission("enquiry_manager", "canPublish")).toBe(false);
    expect(hasPermission("enquiry_manager", "canManageUsers")).toBe(false);
    expect(hasPermission("enquiry_manager", "canManageSettings")).toBe(false);
    expect(hasPermission("enquiry_manager", "canUploadMedia")).toBe(false);
  });

  it("assertPermission throws a forbidden AppError for missing permissions", () => {
    expect(() => assertPermission("editor", "canPublish")).toThrowError(
      AppError,
    );
    try {
      assertPermission("enquiry_manager", "canEditContent");
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).kind).toBe("forbidden");
    }
  });

  it("assertPermission passes for allowed permissions", () => {
    expect(() => assertPermission("administrator", "canPublish")).not.toThrow();
    expect(() => assertPermission("editor", "canEditContent")).not.toThrow();
  });
});
