// src/common/view-locals.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../companies/company.entity';

@Injectable()
export class ViewLocalsMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: any, res: any, next: () => void) {
    // ログイン中のユーザー
    const user = req.session?.user ?? null;
    res.locals.currentUser = user;

    let companyType: 'ses' | 'end' | null = null;

    // 1) セッションに company_type があればそれを使用
    if (user?.company_type === 'ses' || user?.company_type === 'end') {
      companyType = user.company_type;
    }

    // 2) セッションに無ければ DB から取得
    else if (user?.company_id) {
      try {
        const repo = this.dataSource.getRepository(Company);
        const company = await repo.findOne({ where: { id: user.company_id } });
        if (company?.company_type === 'ses' || company?.company_type === 'end') {
          companyType = company.company_type;
        }
      } catch {}
    }

    res.locals.companyType = companyType;

    // CSRF token を全テンプレへ
    if (typeof req.csrfToken === 'function') {
      try { res.locals.csrfToken = req.csrfToken(); } catch {}
    }

    next();
  }
}
