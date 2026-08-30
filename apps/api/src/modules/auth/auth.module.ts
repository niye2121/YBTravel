import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";
import { RoleGuard } from "./role.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, RoleGuard],
  exports: [AuthService, AuthGuard, AdminGuard, RoleGuard],
})
export class AuthModule {}
