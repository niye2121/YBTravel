import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { z, ZodError } from "zod";
import type { LoginResponse, User } from "@yb-travel/shared";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { AuthGuard, type AuthenticatedRequest } from "./auth.guard";

/**
 * Defined locally rather than imported from @yb-travel/shared — that
 * package is consumed as raw TypeScript source (no build step), which is
 * safe for `import type` (erased at compile time) but not for real values:
 * a value import resolves through the workspace symlink into shared's .ts
 * source, which plain `node dist/main.js` can't execute at runtime. Keep
 * the field shape in sync with loginSchema in packages/shared/src/user.ts.
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Req() request: Request, @Body() body: unknown): Promise<LoginResponse> {
    let credentials;
    try {
      credentials = loginSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
    const { email, password } = credentials;

    const user = await this.authService.validateCredentials(email, password, request.ip ?? request.socket.remoteAddress ?? "unknown");
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return { token: this.authService.signToken(user), user };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest): User {
    return request.user;
  }
}
