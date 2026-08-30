import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BookingFeesController } from "./booking-fees.controller";
import { BookingFeesService } from "./booking-fees.service";

@Module({
  imports: [AuthModule],
  controllers: [BookingFeesController],
  providers: [BookingFeesService],
})
export class BookingFeesModule {}
