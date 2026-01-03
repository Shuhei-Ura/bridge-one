// src/auth/company-access.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CompanyAccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const companyIdParam = String(req.params.companyId ?? '');
    const userCompanyId = String(req.user?.company_id ?? req.session?.user?.company_id ?? '');
    if (companyIdParam && userCompanyId && companyIdParam === userCompanyId) return true;
    throw new ForbiddenException('Access denied: wrong company scope');
  }
}