import { SetMetadata } from "@nestjs/common";
import type { StaffPermission } from "@yb-travel/shared";

export const ALLOWED_PERMISSIONS_KEY = "allowed_permissions";

/**
 * Attaches the permissions accepted by an endpoint. PermissionGuard treats
 * multiple values as alternatives, allowing an action when the user has any.
 */
export const AllowedPermissions = (...permissions: StaffPermission[]) =>
  SetMetadata(ALLOWED_PERMISSIONS_KEY, permissions);
