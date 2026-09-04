import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AssignmentRoutingController } from "./assignment-routing.controller";
import { AssignmentRoutingService } from "./assignment-routing.service";

@Module({
  imports: [AuthModule],
  controllers: [AssignmentRoutingController],
  providers: [AssignmentRoutingService],
  exports: [AssignmentRoutingService],
})
export class AssignmentRoutingModule {}
