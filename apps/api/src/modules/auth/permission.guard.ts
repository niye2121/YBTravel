import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { StaffPermission } from "@yb-travel/shared";
import { ALLOWED_PERMISSIONS_KEY } from "./allowed-permissions.decorator";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Enforces database-derived effective permissions after AuthGuard has loaded
 * the current user. A JWT never carries or decides the permission result.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<StaffPermission[]>(ALLOWED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (allowed.some((permission) => request.user.permissions.includes(permission))) return true;
    throw new ForbiddenException("You do not have permission to perform this action");
  }
}
