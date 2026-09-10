/**
 * Role definitions and permission checks.
 *
 * Permissions are enforced in the server side data access layer and on
 * every protected action and endpoint. Hidden buttons and route redirects
 * are user experience concerns only, never security controls.
 */

import type { UserRole } from "@/lib/db";
import { AppError } from "@/lib/errors";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  editor: "Editor",
  enquiry_manager: "Enquiry Manager",
};

interface RolePermissions {
  label: string;
  canViewAdmin: boolean;
  canEditContent: boolean;
  canSubmitForReview: boolean;
  canPublish: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canUploadMedia: boolean;
  canManageMedia: boolean;
  canViewAudit: boolean;
  canAccessEnquiries: boolean;
  canExportEnquiries: boolean;
}

export const PERMISSIONS: Record<UserRole, RolePermissions> = {
  administrator: {
    label: ROLE_LABELS.administrator,
    canViewAdmin: true,
    canEditContent: true,
    canSubmitForReview: true,
    canPublish: true,
    canManageSettings: true,
    canManageUsers: true,
    canUploadMedia: true,
    canManageMedia: true,
    canViewAudit: true,
    canAccessEnquiries: true,
    canExportEnquiries: true,
  },
  editor: {
    label: ROLE_LABELS.editor,
    canViewAdmin: true,
    canEditContent: true,
    canSubmitForReview: true,
    canPublish: false,
    canManageSettings: false,
    canManageUsers: false,
    canUploadMedia: true,
    canManageMedia: true,
    canViewAudit: false,
    canAccessEnquiries: false,
    canExportEnquiries: false,
  },
  enquiry_manager: {
    label: ROLE_LABELS.enquiry_manager,
    canViewAdmin: true,
    canEditContent: false,
    canSubmitForReview: false,
    canPublish: false,
    canManageSettings: false,
    canManageUsers: false,
    canUploadMedia: false,
    canManageMedia: false,
    canViewAudit: false,
    canAccessEnquiries: true,
    canExportEnquiries: true,
  },
};

export type Permission = keyof RolePermissions;

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return PERMISSIONS[role][permission] === true;
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AppError("forbidden", "Your role does not allow this action.");
  }
}
