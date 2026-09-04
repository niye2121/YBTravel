import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";
import { AssignmentRoutingModule } from "../assignment-routing/assignment-routing.module";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [AuthModule, AssignmentRoutingModule, ClientsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
