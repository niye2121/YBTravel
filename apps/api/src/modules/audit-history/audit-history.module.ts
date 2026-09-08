import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditHistoryController } from "./audit-history.controller";
import { AuditHistoryService } from "./audit-history.service";

@Module({ imports: [AuthModule], controllers: [AuditHistoryController], providers: [AuditHistoryService] })
export class AuditHistoryModule {}
