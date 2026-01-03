import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

export type AppRole = 'admin' | 'manager' | 'member';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // ハンドラー → クラス の順で @Roles を解決
    const allowed = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // 指定なしなら通す
    if (!allowed || allowed.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const role: AppRole | undefined =
      req.user?.role ?? req.session?.user?.role;

    if (role && allowed.includes(role)) return true;
    throw new ForbiddenException('Insufficient role');
  }
}
