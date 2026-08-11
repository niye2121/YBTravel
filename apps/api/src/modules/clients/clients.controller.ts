import { Controller, Get } from "@nestjs/common";

@Controller("clients")
export class ClientsController {
  // Placeholder — Phase 1 client/traveller records (P1-02, P1-04) land here.
  @Get("ping")
  ping() {
    return { module: "clients" };
  }
}
