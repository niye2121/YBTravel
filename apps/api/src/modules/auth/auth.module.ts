import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";
import { RoleGuard } from "./role.guard";
import { PermissionGuard } from "./permission.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, RoleGuard, PermissionGuard],
  exports: [AuthService, AuthGuard, AdminGuard, RoleGuard, PermissionGuard],
})
export class AuthModule {}
