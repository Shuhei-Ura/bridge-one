import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';

const ALLOWLIST: RegExp[] = [
  /^\/auth(\/.*)?$/,        // ログイン/ログアウト/コールバック等
  /^\/css\/.*/,             // 静的資産
  /^\/js\/.*/,
  /^\/img\/.*/,
  /^\/favicon\.ico$/,
  /^\/healthz$/,            // 任意: ヘルスチェック
];

function wantsJson(req: Request) {
  const accept = req.headers['accept'] || '';
  const xrw = req.headers['x-requested-with'] || '';
  return String(accept).includes('application/json') || String(xrw).toLowerCase() === 'xmlhttprequest';
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const path = req.path;

    // 許可リストに一致 → 通す
    if (ALLOWLIST.some((re) => re.test(path))) return true;

    // セッションにユーザーがいれば通す（ついでに req.user へも載せる）
    const sessUser = (req.session as any)?.user;
    if (sessUser) {
      // 下流の guard / handler が一律 req.user を参照できるように
      (req as any).user = sessUser;
      return true;
    }

    // 未ログイン：HTMLはリダイレクト、API/AJAXは401
    if (wantsJson(req)) {
      throw new UnauthorizedException();
    } else {
      res.redirect('/auth/login');
      return false;
    }
  }
}
