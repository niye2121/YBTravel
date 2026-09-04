import { SetMetadata } from "@nestjs/common";
import type { StaffRole } from "@yb-travel/shared";

export const ALLOWED_ROLES_KEY = "allowed_roles";

/** Declares which freshly loaded database roles may execute an operation. */
export const AllowedRoles = (...roles: StaffRole[]) => SetMetadata(ALLOWED_ROLES_KEY, roles);
