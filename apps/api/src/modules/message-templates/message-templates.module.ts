import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MessageTemplatesController } from "./message-templates.controller";
import { MessageTemplatesService } from "./message-templates.service";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService],
  exports: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
