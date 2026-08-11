import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { User } from "@yb-travel/shared";
import { AuthService } from "./auth.service";

export type AuthenticatedRequest = Request & { user: User };

/**
 * Requires a valid "Authorization: Bearer <token>" header, looks the user
 * up fresh from the database (not just the token's claims), and attaches
 * it to the request. Any route behind this guard can read req.user.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    (request as AuthenticatedRequest).user = user;
    return true;
  }
}
