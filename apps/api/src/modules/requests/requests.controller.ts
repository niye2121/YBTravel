import { Controller, Get } from "@nestjs/common";

@Controller("requests")
export class RequestsController {
  // Placeholder — Phase 1/2 travel-request workflow (P1-21, P2-01..P2-20) lands here.
  @Get("ping")
  ping() {
    return { module: "requests" };
  }
}
