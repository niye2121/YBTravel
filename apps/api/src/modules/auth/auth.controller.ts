import { Controller, Get } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  // Placeholder — Auth0 wiring is pending formal client approval
  // (docs/05-open-decisions.md #1). Application-side authorization
  // (roles, resource-level checks) also lands here per CLAUDE.md.
  @Get("ping")
  ping() {
    return { module: "auth" };
  }
}
