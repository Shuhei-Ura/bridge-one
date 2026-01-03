// src/auth/auth.controller.ts
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('login')
  loginForm(@Req() req, @Res() res) {
    const msg = (req.query?.msg as string) || null;
    const returnTo = (req.query?.returnTo as string) || '/menu';
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;
    return res.render('auth/login', { title: 'ログイン', msg, returnTo, csrfToken });
  }

  @Post('login')
  async login(@Req() req, @Res() res, @Body() body: any) {
    const { email, password } = body;
    const returnTo = body?.returnTo || '/menu';

    try {
      const user = await this.auth.validateUser(email, password);

      // 認証失敗 → 同じログイン画面を再描画（白いエラー画面は出さない）
      if (!user) {
        return res.render('auth/login', {
          title: 'ログイン',
          err: 'メールかパスワードが違います',
          email,                                 // 入力保持
          returnTo,                              // hiddenで再送
          csrfToken: typeof req.csrfToken === 'function' ? req.csrfToken() : undefined,
        });
      }

      // 必要最小限をセッションに保存
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // 'admin' |'manager' | 'member'
        company_id: user.company_id,
      };

      // オープンリダイレクト対策
      const isSafe =
        typeof returnTo === 'string' &&
        returnTo.startsWith('/') &&
        !returnTo.startsWith('//');

      const next = isSafe ? returnTo : '/menu';
      return req.session.save(() => res.redirect(next));
    } catch {
      // 例外（UnauthorizedException等）も同じく画面に戻す
      return res.render('auth/login', {
        title: 'ログイン',
        err: 'メールかパスワードが違います',
        email,
        returnTo,
        csrfToken: typeof req.csrfToken === 'function' ? req.csrfToken() : undefined,
      });
    }
  }

  @Post('logout')
  logout(@Req() req, @Res() res) {
    req.session.destroy(() => res.redirect('/auth/login?msg=ログアウトしました'));
  }
}
