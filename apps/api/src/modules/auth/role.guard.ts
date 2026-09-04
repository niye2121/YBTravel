import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { StaffRole } from "@yb-travel/shared";
import { ALLOWED_ROLES_KEY } from "./allowed-roles.decorator";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Fine-grained role gate used after AuthGuard. AuthGuard has already re-read
 * the account from PostgreSQL, so this never authorizes from stale JWT roles.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<StaffRole[]>(ALLOWED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed || allowed.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user.roles.some((role) => allowed.includes(role))) return true;
    throw new ForbiddenException("Your assigned role cannot perform this action");
  }
}
