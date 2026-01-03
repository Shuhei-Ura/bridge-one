// src/talents/controllers/global-talent.controller.ts
import { Controller, Get, Query, Render, UseGuards, Req } from '@nestjs/common';
import { GlobalTalentService } from '../services/global-talent.service';
import { GlobalSearchTalentDto } from '../dto/global-search-talent.dto';
import { AuthGuard } from '../../auth/auth.guard';

@UseGuards(AuthGuard) // 認証必須（ロール制限なし）
@Controller()
export class GlobalTalentController {
  constructor(private readonly svc: GlobalTalentService) {}

  @Get('search/talents')
  @Render('talents/global-list')
  async list(
    @Req() req: any,
    @Query('ageMax') ageMax?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('prefecture') prefecture?: string,
    @Query('workStyleMax') workStyleMax?: string,
    @Query('summaryQ') summaryQ?: string,
    @Query('page') page = '1',
    @Query('size') size = '20',
  ) {
    const p0 = Math.max(parseInt(page, 10) || 1, 1) - 1;
    const s  = Math.min(Math.max(parseInt(size, 10) || 20, 1), 100);

    const hasQuery =
      !!ageMax || !!priceMin || !!priceMax || !!prefecture || !!workStyleMax || !!summaryQ;

    const companyId = req.user?.company_id ?? ''; // 戻る/リクエスト導線に使用

    if (!hasQuery) {
      // 条件なし＝検索せず0件。backEncは未設定
      return {
        title: 'グローバル要員一覧',
        companyId,
        filters: { ageMax, priceMin, priceMax, prefecture, workStyleMax, summaryQ },
        results: [],
        total: 0,
        page: 1,
        size: s,
        pages: 0,
        hasQuery,
      };
    }

    const dto: GlobalSearchTalentDto = {
      ageMax: ageMax ? Number(ageMax) : undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      prefecture: prefecture || undefined,
      workStyleMax: workStyleMax ? Number(workStyleMax) : undefined,
      summaryQ: summaryQ || undefined,
      page: p0,
      pageSize: s,
      // 自社の要員を除外
      excludeCompanyId: companyId ? String(companyId) : undefined,
    };

    const { items, total, page: cur, pageSize } = await this.svc.search(dto);

    const rows = items.map(t => ({
      id: t.id,
      internal_name: t.internal_name,
      age: t.age ?? null,
      unit_price: t.desired_rate ?? null,
      prefecture: t.prefecture ?? null,
      work_style_level: t.work_style_level ?? null,
    }));

    // ▼ 戻り先URLを現在の検索条件で生成（詳細→戻る で使う）
    const params = new URLSearchParams();
    const rawFilters = { ageMax, priceMin, priceMax, prefecture, workStyleMax, summaryQ };
    for (const [k, v] of Object.entries(rawFilters)) {
      if (v != null && v !== '') params.set(k, String(v));
    }
    params.set('page', String(cur + 1));
    params.set('size', String(pageSize));
    const qs = params.toString();
    const back = `/search/talents?${qs}`;
    const backEnc = encodeURIComponent(back);

    return {
      title: 'グローバル要員一覧',
      companyId,
      filters: rawFilters,
      results: rows,
      total,
      page: cur + 1,
      size: pageSize,
      pages: Math.ceil(total / pageSize),
      hasQuery,
      backEnc, // ← 追加：HBSで /talents/:id?back={{backEnc}} に使う
    };
  }
}
