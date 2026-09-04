import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Must run after AuthGuard (list AuthGuard first in @UseGuards) — it
 * relies on req.user already being populated. Only lets
 * system_administrator through, per P1-18 in docs/03-deliverables.md.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user.roles.includes("system_administrator")) {
      throw new ForbiddenException("System Administrator role required");
    }
    return true;
  }
}
