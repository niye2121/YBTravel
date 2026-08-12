import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TravellersController } from "./travellers.controller";
import { TravellersService } from "./travellers.service";

@Module({
  imports: [AuthModule],
  controllers: [TravellersController],
  providers: [TravellersService],
})
export class TravellersModule {}
