import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClientRecordsController, RecordDocumentsController, RequestRecordsController } from "./entity-records.controller";
import { EntityRecordsService } from "./entity-records.service";

@Module({ imports: [AuthModule], controllers: [ClientRecordsController, RequestRecordsController, RecordDocumentsController], providers: [EntityRecordsService] })
export class EntityRecordsModule {}
