import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // 既存のセッションを利用: req.session.user?.role === 'admin'
    return Boolean(req?.session?.user && req.session.user.role === 'admin');
  }
}