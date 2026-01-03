// src/auth/auth-decorators.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RolesGuard, AppRole } from './roles.guard';
import { Roles } from './roles.decorator';
import { CompanyAccessGuard } from './company-access.guard';

// 認証だけ（全ロール可）
export const AuthOnly = () => applyDecorators(
  UseGuards(AuthGuard),
);

// 認証 + 会社スコープ一致（全ロール可）
export const AuthCompany = () => applyDecorators(
  UseGuards(AuthGuard, CompanyAccessGuard),
);

// 認証 + ロール制御
export const AuthRoles = (...roles: AppRole[]) => applyDecorators(
  UseGuards(AuthGuard, RolesGuard),
  Roles(...roles),
);

// 認証 + ロール制御 + 会社スコープ一致
export const AuthCompanyRoles = (...roles: AppRole[]) => applyDecorators(
  UseGuards(AuthGuard, RolesGuard, CompanyAccessGuard),
  Roles(...roles),
);
