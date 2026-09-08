import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupervisorController } from "./supervisor.controller";
import { SupervisorService } from "./supervisor.service";

@Module({ imports: [AuthModule], controllers: [SupervisorController], providers: [SupervisorService], exports: [SupervisorService] })
export class SupervisorModule {}
