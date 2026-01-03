import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CompanyTypeGuard implements CanActivate {
  constructor(private readonly types: ('ses'|'end')[]) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const companyType = req.res?.locals?.companyType; // ミドルウェアで注入
    return this.types.includes(companyType);
  }
}
// 使うとき: new CompanyTypeGuard(['ses'])